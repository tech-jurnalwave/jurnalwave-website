import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ success: false, error: 'URL parameter required' }, { status: 400 });
  }

  const cleanUrl = targetUrl.trim();
  const lower = cleanUrl.toLowerCase();

  try {
    // 1. YouTube & YouTube Shorts
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      let ytId = '';
      if (lower.includes('/shorts/')) {
        const match = cleanUrl.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) ytId = match[1];
      } else if (lower.includes('v=')) {
        const match = cleanUrl.match(/v=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) ytId = match[1];
      } else if (lower.includes('youtu.be/')) {
        const match = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) ytId = match[1];
      }

      if (ytId) {
        return NextResponse.json({
          success: true,
          data: {
            platform: 'youtube',
            thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
            creator: '',
            title: '',
          },
        });
      }
    }

    // 2. TikTok (termasuk shortlink vt.tiktok.com)
    if (lower.includes('tiktok.com')) {
      try {
        // Coba endpoint resmi TikTok oEmbed (cepat, bebas token & langsung mengembalikan cover frame)
        try {
          const oembedRes = await fetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`,
            {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              cache: 'no-store',
            }
          );
          if (oembedRes.ok) {
            const oembedJson = await oembedRes.json();
            if (oembedJson.thumbnail_url) {
              return NextResponse.json({
                success: true,
                data: {
                  platform: 'tiktok',
                  thumbnailUrl: oembedJson.thumbnail_url,
                  creator: oembedJson.author_name ? `@${oembedJson.author_name}` : '',
                  title: oembedJson.title || '',
                },
              });
            }
          }
        } catch {}

        // Fallback: Scraping OpenGraph
        const res = await fetch(cleanUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent':
              'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          },
        });

        const finalUrl = res.url;
        let creator = '';
        if (finalUrl.includes('tiktok.com/@')) {
          const match = finalUrl.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/);
          if (match && match[1]) creator = `@${match[1]}`;
        }

        const html = await res.text();
        const imgMatch =
          html.match(/property="og:image"\s+content="([^"]+)"/) ||
          html.match(/content="([^"]+)"\s+property="og:image"/);
        const titleMatch =
          html.match(/property="og:title"\s+content="([^"]+)"/) ||
          html.match(/content="([^"]+)"\s+property="og:title"/);

        let thumbnailUrl = '';
        if (imgMatch && imgMatch[1]) {
          thumbnailUrl = imgMatch[1].replace(/&amp;/g, '&');
        }

        let title = '';
        if (titleMatch && titleMatch[1]) {
          const rawTitle = titleMatch[1].replace(/&amp;/g, '&').trim();
          if (!rawTitle.toLowerCase().startsWith('tiktok ·')) {
            title = rawTitle;
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            platform: 'tiktok',
            thumbnailUrl,
            creator,
            title,
          },
        });
      } catch (err) {
        console.warn('Error fetching TikTok metadata:', err);
      }
    }

    // 3. Instagram
    if (lower.includes('instagram.com')) {
      let creator = '';
      let thumbnailUrl = '';
      let title = '';

      const userMatch = cleanUrl.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
      if (userMatch && userMatch[1] && userMatch[1] !== 'reel' && userMatch[1] !== 'reels' && userMatch[1] !== 'p') {
        creator = `@${userMatch[1]}`;
      }

      // Ambil shortcode reel / post
      const codeMatch = cleanUrl.match(/\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/);
      const shortcode = codeMatch && codeMatch[1] ? codeMatch[1] : '';

      if (shortcode) {
        // Coba 1: Embed captioned page resmi Instagram (memuat foto poster asli di class EmbeddedMediaImage)
        try {
          const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
          const res = await fetch(embedUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            cache: 'no-store',
          });

          if (res.ok) {
            const html = await res.text();
            const imgMatch =
              html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/) ||
              html.match(/src="([^"]+)"[^>]*class="EmbeddedMediaImage"/) ||
              html.match(/property="og:image"\s+content="([^"]+)"/) ||
              html.match(/content="([^"]+)"\s+property="og:image"/);

            if (imgMatch && imgMatch[1]) {
              thumbnailUrl = imgMatch[1].replace(/&amp;/g, '&');
            }

            const titleMatch =
              html.match(/property="og:title"\s+content="([^"]+)"/) ||
              html.match(/class="Caption"[^>]*>([^<]+)</);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].replace(/&amp;/g, '&').trim();
            }
          }
        } catch (err) {
          console.warn('Instagram embed fetch notice:', err);
        }

        // Coba 2: Jika belum dapat, coba fetch direct URL dengan crawler User-Agent
        if (!thumbnailUrl) {
          try {
            const res = await fetch(cleanUrl, {
              headers: {
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
              },
              cache: 'no-store',
            });
            if (res.ok) {
              const html = await res.text();
              const imgMatch =
                html.match(/property="og:image"\s+content="([^"]+)"/) ||
                html.match(/content="([^"]+)"\s+property="og:image"/);
              if (imgMatch && imgMatch[1]) {
                thumbnailUrl = imgMatch[1].replace(/&amp;/g, '&');
              }
            }
          } catch {}
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          platform: 'instagram',
          thumbnailUrl,
          creator,
          title,
        },
      });
    }

    // 4. Facebook
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
      return NextResponse.json({
        success: true,
        data: {
          platform: 'facebook',
          thumbnailUrl: '',
          creator: '',
          title: '',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        platform: 'instagram',
        thumbnailUrl: '',
        creator: '',
        title: '',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}
