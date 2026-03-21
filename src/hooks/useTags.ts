import { useQuery } from '@tanstack/react-query';
import type { Tag, TagDetail } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/tags`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTag(slug: string) {
  return useQuery<TagDetail>({
    queryKey: ['tag', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/tags/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch tag');
      return res.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
