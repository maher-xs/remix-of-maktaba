import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received PDF metadata extraction request');

    let bytes: Uint8Array;
    let filename = 'unknown.pdf';

    // Check content type to determine how to parse the request
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (base64 encoded file)
      const { file, filename: fname } = await req.json();
      
      if (!file) {
        console.error('No file provided in JSON body');
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Decode base64 to Uint8Array
      const binaryString = atob(file);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (fname) filename = fname;
      console.log('File received from JSON:', filename, 'Size:', bytes.length);
      
    } else {
      // Handle FormData request (legacy support)
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        console.error('No file provided in FormData');
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      filename = file.name;
      const arrayBuffer = await file.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
      console.log('File received from FormData:', filename, 'Size:', bytes.length);
    }
    
    // Convert first part of PDF to string to find metadata
    const decoder = new TextDecoder('latin1');
    const pdfText = decoder.decode(bytes.slice(0, Math.min(bytes.length, 50000)));
    
    let title = '';
    let author = '';
    let year = '';
    let pages = 0;
    let publisher = '';
    
    // Extract Title from PDF metadata
    const titleMatch = pdfText.match(/\/Title\s*\(([^)]+)\)/i) || 
                       pdfText.match(/\/Title\s*<([^>]+)>/i);
    if (titleMatch) {
      title = decodeURIComponent(titleMatch[1].replace(/\\x/g, '%').replace(/\\/g, ''));
      // Clean up hex encoded strings
      if (titleMatch[0].includes('<')) {
        title = hexToString(titleMatch[1]);
      }
    }
    
    // Extract Author from PDF metadata
    const authorMatch = pdfText.match(/\/Author\s*\(([^)]+)\)/i) ||
                        pdfText.match(/\/Author\s*<([^>]+)>/i);
    if (authorMatch) {
      author = decodeURIComponent(authorMatch[1].replace(/\\x/g, '%').replace(/\\/g, ''));
      if (authorMatch[0].includes('<')) {
        author = hexToString(authorMatch[1]);
      }
    }
    
    // Extract Creation Date for year
    const dateMatch = pdfText.match(/\/CreationDate\s*\(D:(\d{4})/i);
    if (dateMatch) {
      year = dateMatch[1];
    }
    
    // Try to find year in other metadata
    if (!year) {
      const yearMatch = pdfText.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
      if (yearMatch) {
        year = yearMatch[1];
      }
    }
    
    // Count pages (approximate)
    const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches) {
      pages = pageMatches.length;
    }
    
    // Try to get page count from metadata
    const pageCountMatch = pdfText.match(/\/Count\s+(\d+)/);
    if (pageCountMatch) {
      pages = parseInt(pageCountMatch[1], 10);
    }
    
    // Extract Producer/Creator as potential publisher
    const producerMatch = pdfText.match(/\/Producer\s*\(([^)]+)\)/i);
    if (producerMatch) {
      publisher = producerMatch[1].replace(/\\/g, '');
    }

    const metadata = {
      title: cleanString(title),
      author: cleanString(author),
      year: year,
      pages: pages,
      publisher: cleanString(publisher),
    };

    console.log('Extracted metadata:', metadata);

    return new Response(
      JSON.stringify({ success: true, metadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error extracting PDF metadata:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract PDF metadata', 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to convert hex string to regular string
function hexToString(hex: string): string {
  try {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  } catch {
    return hex;
  }
}

// Clean and normalize strings
function cleanString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/^\uFEFF/, '') // Remove BOM
    .trim();
}
