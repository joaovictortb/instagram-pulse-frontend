export interface InstagramUser {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  biography?: string;
  website?: string;
}

export interface InstagramMedia {
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  insights?: InstagramMediaInsights;
}

export interface InstagramMediaInsights {
  impressions?: number;
  reach?: number;
  engagement?: number;
  saved?: number;
  video_views?: number;
}

export interface InstagramAccountInsights {
  impressions: number;
  reach: number;
  profile_views: number;
  follower_count: number;
  website_clicks: number;
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  media_id: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'question' | 'spam';
}

export interface DashboardData {
  account: InstagramUser;
  recentMedia: InstagramMedia[];
  insights: InstagramAccountInsights;
  topPosts: InstagramMedia[];
}
