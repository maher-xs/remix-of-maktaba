import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Discussion {
  id: string;
  user_id: string;
  book_id: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
  book?: {
    title: string;
    cover_url: string | null;
  };
  votes_count?: number;
  user_vote?: number | null;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  user_id: string;
  parent_reply_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
  votes_count?: number;
  user_vote?: number | null;
}

export const useDiscussions = (bookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['discussions', bookId],
    queryFn: async (): Promise<Discussion[]> => {
      // Fetch discussions
      let queryBuilder = supabase
        .from('discussions')
        .select(`
          *,
          book:books(title, cover_url)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (bookId) {
        queryBuilder = queryBuilder.eq('book_id', bookId);
      }

      const { data: discussionsData, error } = await queryBuilder;

      if (error) throw error;

      if (!discussionsData || discussionsData.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(discussionsData.map(d => d.user_id))];
      
      // Fetch profiles separately using public_profiles view
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Get votes for each discussion
      const discussionIds = discussionsData.map(d => d.id);
      
      const { data: votes } = await supabase
        .from('discussion_votes')
        .select('discussion_id, vote_type')
        .in('discussion_id', discussionIds);

      const { data: userVotes } = user ? await supabase
        .from('discussion_votes')
        .select('discussion_id, vote_type')
        .in('discussion_id', discussionIds)
        .eq('user_id', user.id) : { data: [] };

      return discussionsData.map(d => ({
        ...d,
        author: profilesMap.get(d.user_id) || null,
        book: Array.isArray(d.book) ? d.book[0] : d.book,
        votes_count: votes?.filter(v => v.discussion_id === d.id)
          .reduce((sum, v) => sum + v.vote_type, 0) || 0,
        user_vote: userVotes?.find(v => v.discussion_id === d.id)?.vote_type || null
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('discussions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discussions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['discussions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useDiscussion = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['discussion', id],
    queryFn: async (): Promise<Discussion | null> => {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          book:books(title, cover_url)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('public_profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .eq('id', data.user_id)
        .maybeSingle();

      // Get votes
      const { data: votes } = await supabase
        .from('discussion_votes')
        .select('vote_type')
        .eq('discussion_id', id);

      const { data: userVote } = user ? await supabase
        .from('discussion_votes')
        .select('vote_type')
        .eq('discussion_id', id)
        .eq('user_id', user.id)
        .maybeSingle() : { data: null };

      // Increment view count
      await supabase
        .from('discussions')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', id);

      return {
        ...data,
        author: profileData || null,
        book: Array.isArray(data.book) ? data.book[0] : data.book,
        votes_count: votes?.reduce((sum, v) => sum + v.vote_type, 0) || 0,
        user_vote: userVote?.vote_type || null
      };
    },
    enabled: !!id,
  });
};

export const useDiscussionReplies = (discussionId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['discussion-replies', discussionId],
    queryFn: async (): Promise<DiscussionReply[]> => {
      const { data: repliesData, error } = await supabase
        .from('discussion_replies')
        .select('*')
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!repliesData || repliesData.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      
      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const replyIds = repliesData.map(r => r.id);

      const { data: votes } = await supabase
        .from('discussion_votes')
        .select('reply_id, vote_type')
        .in('reply_id', replyIds);

      const { data: userVotes } = user ? await supabase
        .from('discussion_votes')
        .select('reply_id, vote_type')
        .in('reply_id', replyIds)
        .eq('user_id', user.id) : { data: [] };

      return repliesData.map(r => ({
        ...r,
        author: profilesMap.get(r.user_id) || null,
        votes_count: votes?.filter(v => v.reply_id === r.id)
          .reduce((sum, v) => sum + v.vote_type, 0) || 0,
        user_vote: userVotes?.find(v => v.reply_id === r.id)?.vote_type || null
      }));
    },
    enabled: !!discussionId,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`replies-${discussionId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'discussion_replies',
          filter: `discussion_id=eq.${discussionId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['discussion-replies', discussionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [discussionId, queryClient]);

  return query;
};

export const useCreateDiscussion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content, bookId }: { title: string; content: string; bookId?: string }) => {
      if (!user) throw new Error('يجب تسجيل الدخول');

      const { data, error } = await supabase
        .from('discussions')
        .insert({
          user_id: user.id,
          title,
          content,
          book_id: bookId || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast.success('تم إنشاء المناقشة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating discussion:', error);
      toast.error('حدث خطأ أثناء إنشاء المناقشة');
    }
  });
};

export const useCreateReply = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ discussionId, content, parentReplyId }: { discussionId: string; content: string; parentReplyId?: string }) => {
      if (!user) throw new Error('يجب تسجيل الدخول');

      const { data, error } = await supabase
        .from('discussion_replies')
        .insert({
          discussion_id: discussionId,
          user_id: user.id,
          content,
          parent_reply_id: parentReplyId || null
        })
        .select()
        .single();

      if (error) throw error;

      // Process mentions and send notifications
      const mentionRegex = /@(\w+)/g;
      let match;
      const mentionedUsernames: string[] = [];
      while ((match = mentionRegex.exec(content)) !== null) {
        mentionedUsernames.push(match[1]);
      }

      if (mentionedUsernames.length > 0) {
        // Get mentioned users' IDs
        const { data: mentionedUsers } = await supabase
          .from('public_profiles')
          .select('id, username')
          .in('username', mentionedUsernames);

        if (mentionedUsers && mentionedUsers.length > 0) {
          // Get discussion for notification
          const { data: discussion } = await supabase
            .from('discussions')
            .select('title')
            .eq('id', discussionId)
            .single();

          // Create mentions and notifications
          for (const mentionedUser of mentionedUsers) {
            if (mentionedUser.id !== user.id) {
              // Insert mention record
              await supabase.from('mentions').insert({
                mentioner_id: user.id,
                mentioned_user_id: mentionedUser.id,
                reply_id: data.id,
                discussion_id: discussionId
              });

              // Send notification
              await supabase.from('notifications').insert({
                user_id: mentionedUser.id,
                type: 'mention',
                title: 'تمت الإشارة إليك',
                message: `أشار إليك شخص في نقاش "${discussion?.title || 'مناقشة'}"`,
                data: {
                  discussion_id: discussionId,
                  reply_id: data.id,
                  mentioner_id: user.id
                }
              });
            }
          }
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-replies', variables.discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      toast.success('تم إضافة الرد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة الرد');
    }
  });
};

export const useVote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ discussionId, replyId, voteType }: { discussionId?: string; replyId?: string; voteType: 1 | -1 }) => {
      if (!user) throw new Error('يجب تسجيل الدخول');

      // Check existing vote
      let existingVote = null;
      if (discussionId) {
        const { data } = await supabase
          .from('discussion_votes')
          .select('*')
          .eq('discussion_id', discussionId)
          .eq('user_id', user.id)
          .maybeSingle();
        existingVote = data;
      } else if (replyId) {
        const { data } = await supabase
          .from('discussion_votes')
          .select('*')
          .eq('reply_id', replyId)
          .eq('user_id', user.id)
          .maybeSingle();
        existingVote = data;
      }

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          const { error } = await supabase
            .from('discussion_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
        } else {
          // Update vote
          const { error } = await supabase
            .from('discussion_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
        }
      } else {
        // Create new vote
        const { error } = await supabase
          .from('discussion_votes')
          .insert({
            user_id: user.id,
            discussion_id: discussionId || null,
            reply_id: replyId || null,
            vote_type: voteType
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      queryClient.invalidateQueries({ queryKey: ['discussion-replies'] });
    }
  });
};

export const useDeleteDiscussion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast.success('تم حذف المناقشة');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الحذف');
    }
  });
};

export const usePinDiscussion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('discussions')
        .update({ is_pinned: isPinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { isPinned }) => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      toast.success(isPinned ? 'تم تثبيت المناقشة' : 'تم إلغاء التثبيت');
    }
  });
};

export const useUpdateReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, content }: { replyId: string; content: string }) => {
      const { error } = await supabase
        .from('discussion_replies')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-replies'] });
      toast.success('تم تحديث الرد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث الرد');
    }
  });
};

export const useDeleteReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase
        .from('discussion_replies')
        .delete()
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-replies'] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion'] });
      toast.success('تم حذف الرد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الرد');
    }
  });
};
