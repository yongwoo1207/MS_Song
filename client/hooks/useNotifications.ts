import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/lib/notifications";

const UNREAD = ["notifications", "unread"];

/** Unread count for the bell, checked every minute while the page is open. */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: UNREAD,
    queryFn: notificationApi.unread,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  return query.data ?? 0;
}

/** The notification list, plus marking it all read. */
export function useNotifications() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: notificationApi.list,
    staleTime: 0,
    retry: 1,
  });
  // Keeps the list as fetched (unread ones stay highlighted), clears the bell
  const markRead = useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => qc.setQueryData(UNREAD, 0),
  });
  return {
    notifications: list.data?.notifications ?? [],
    unread: list.data?.unread ?? 0,
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    markRead,
  };
}
