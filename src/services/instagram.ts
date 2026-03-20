import axios from 'axios';
import { InstagramUser, InstagramMedia, InstagramAccountInsights, InstagramComment } from '../types/instagram';

const BASE_URL = process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.facebook.com/v23.0';
const ACCESS_TOKEN = process.env.META_GRAPH_ACCESS_TOKEN;
const BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    access_token: ACCESS_TOKEN,
  },
});

export const instagramService = {
  async getAccount(): Promise<InstagramUser> {
    if (!BUSINESS_ID) throw new Error('Business ID not configured');
    const { data } = await api.get(`/${BUSINESS_ID}`, {
      params: {
        fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
      },
    });
    return data;
  },

  async getMedia(limit = 20): Promise<InstagramMedia[]> {
    if (!BUSINESS_ID) throw new Error('Business ID not configured');
    const { data } = await api.get(`/${BUSINESS_ID}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit,
      },
    });
    return data.data;
  },

  async getMediaInsights(mediaId: string): Promise<any> {
    const { data } = await api.get(`/${mediaId}/insights`, {
      params: {
        metric: 'views,reach,engagement,saved',
      },
    });
    return data.data.reduce((acc: any, curr: any) => {
      const name = curr.name === 'views' ? 'impressions' : curr.name;
      acc[name] = curr.values[0].value;
      return acc;
    }, {});
  },

  async getAccountInsights(period = 'day'): Promise<any> {
    if (!BUSINESS_ID) throw new Error('Business ID not configured');
    
    // Align to day boundaries (midnight) as required by Meta API
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const until = Math.floor(now.getTime() / 1000);
    const since = until - (28 * 24 * 60 * 60);

    const metrics = [
      { name: 'views', type: 'total_value' },
      { name: 'reach', type: null },
      { name: 'profile_views', type: 'total_value' },
      { name: 'website_clicks', type: 'total_value' },
      { name: 'follower_count', type: null }
    ];

    const results = await Promise.all(metrics.map(async (m) => {
      try {
        const params: any = {
          metric: m.name,
          period,
          since,
          until,
        };
        if (m.type) params.metric_type = m.type;

        const { data } = await api.get(`/${BUSINESS_ID}/insights`, { params });
        return data.data;
      } catch (error: any) {
        const metaError = error.response?.data?.error;
        // Specific warning for missing insights permission
        if (metaError?.type === 'OAuthException' && metaError?.code === 10) {
          console.error(`CRITICAL: Missing 'instagram_manage_insights' permission for metric ${m.name}`);
        } else {
          console.error(`Error fetching metric ${m.name}:`, metaError?.message || error.message);
        }
        return [];
      }
    }));

    const allData = results.flat();
    
    const processed = allData.reduce((acc: any, curr: any) => {
      if (!curr || !curr.name || !curr.values) return acc;
      
      const metricName = curr.name === 'views' ? 'impressions' : curr.name;
      
      acc[metricName] = curr.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
      
      acc[`${metricName}_history`] = curr.values.map((v: any) => ({
        date: v.end_time,
        value: v.value || 0,
      }));
      
      if (curr.values.length >= 14) {
        const last7 = curr.values.slice(-7).reduce((sum: number, v: any) => sum + (v.value || 0), 0);
        const prev7 = curr.values.slice(-14, -7).reduce((sum: number, v: any) => sum + (v.value || 0), 0);
        acc[`${metricName}_trend`] = prev7 !== 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
      } else {
        acc[`${metricName}_trend`] = 0;
      }
      return acc;
    }, {});

    // Fallback for follower_count if insights fail
    if (!processed.follower_count || processed.follower_count === 0) {
      try {
        const account = await this.getAccount();
        processed.follower_count = account.followers_count;
      } catch (e) {
        // Ignore fallback error
      }
    }

    const expectedKeys = ['impressions', 'reach', 'profile_views', 'follower_count', 'website_clicks'];
    expectedKeys.forEach(key => {
      if (processed[key] === undefined) processed[key] = 0;
      if (processed[`${key}_trend`] === undefined) processed[`${key}_trend`] = 0;
      if (processed[`${key}_history`] === undefined) processed[`${key}_history`] = [];
    });

    return processed;
  },

  async getContentPerformanceByType(): Promise<any[]> {
    const media = await this.getMedia(50);
    const performance = media.reduce((acc: any, curr: any) => {
      const type = curr.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 
                   curr.media_type === 'VIDEO' ? 'Vídeo' : 
                   curr.media_type === 'IMAGE' ? 'Imagem' : 'Outros';
      
      if (!acc[type]) acc[type] = { type, value: 0, count: 0 };
      acc[type].value += (curr.like_count + curr.comments_count);
      acc[type].count += 1;
      return acc;
    }, {});

    return Object.values(performance).map((p: any) => ({
      ...p,
      value: Math.round(p.value / p.count) // Average engagement per type
    }));
  },

  async getAudienceInsights(): Promise<any> {
    if (!BUSINESS_ID) throw new Error('Business ID not configured');
    const { data } = await api.get(`/${BUSINESS_ID}/insights`, {
      params: {
        metric: 'audience_city,audience_country,audience_gender_age,audience_locale',
        period: 'lifetime',
      },
    });
    
    return data.data.reduce((acc: any, curr: any) => {
      acc[curr.name] = curr.values[0].value;
      return acc;
    }, {});
  },

  async getComments(mediaId: string): Promise<InstagramComment[]> {
    const { data } = await api.get(`/${mediaId}/comments`, {
      params: {
        fields: 'id,text,username,timestamp',
      },
    });
    return data.data.map((c: any) => ({ ...c, media_id: mediaId }));
  },
};
