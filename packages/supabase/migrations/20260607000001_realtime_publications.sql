-- Add tables to supabase_realtime publication for live UI updates
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_score_submissions;
alter publication supabase_realtime add table public.match_requests;
alter publication supabase_realtime add table public.disputes;
alter publication supabase_realtime add table public.notifications;
