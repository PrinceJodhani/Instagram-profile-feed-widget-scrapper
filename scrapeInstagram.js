const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeInstagramProfile(username) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/119.0.0.0 Safari/537.36'
    );

    // Navigate to the Instagram profile page
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Add a delay to ensure page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Dismiss potential login popup
    try {
      const loginPopup = await page.$('div[role="dialog"]');
      if (loginPopup) {
        const closeButton = await loginPopup.$('button');
        if (closeButton) {
          await closeButton.click();
        } else {
          await page.mouse.click(10, 10);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log('No login popup found or error dismissing it:', error);
    }
    
    // Ensure main content is loaded
    await page.waitForSelector('img', { timeout: 30000 });
    
    // Scroll a few times to load more posts
    let previousHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight) break;
      previousHeight = newHeight;
    }
    
    // Extract profile data with updated selectors
    const profileData = await page.evaluate(() => {
      // Helper function for parsing counts WITHOUT multiplying K and M values
      const parseCount = (str) => {
        if (!str) return 0;
        
        // Just extract the numeric part
        const matches = str.match(/[\d,.]+/);
        if (!matches) return 0;
        
        const numericPart = matches[0].replace(/,/g, '');
        return parseInt(numericPart);
      };

      // Get profile picture
      let profilePicUrl = '';
      const profilePicElement = document.querySelector('img[alt*="profile picture"], img[alt*="Profile photo"]');
      if (profilePicElement) {
        profilePicUrl = profilePicElement.src;
      } else {
        const metaPic = document.querySelector('meta[property="og:image"]');
        if (metaPic) {
          profilePicUrl = metaPic.getAttribute('content') || '';
        }
      }

      // Get username - this seems to be working already
      const usernameElement = document.querySelector('h2, header h2, a[href*="/' + window.location.pathname.split('/')[1] + '/"]');
      const username = usernameElement ? usernameElement.textContent.trim() : window.location.pathname.split('/')[1];
      
      // Find full name - let's try more specific selectors
      let fullName = '';
      // Option 1: Look for the element above the username
      const fullNameElement1 = document.querySelector('header h1, section h1');
      if (fullNameElement1) {
        fullName = fullNameElement1.textContent.trim();
      }
      
      // Option 2: Look for the title in meta data
      if (!fullName) {
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
          const titleText = metaTitle.getAttribute('content') || '';
          // Meta title usually has the format "Name (@username) • Instagram photos and videos"
          const nameMatch = titleText.match(/^([^(]+)/);
          if (nameMatch) {
            fullName = nameMatch[1].trim();
          }
        }
      }
      
      // Option 3: Try specific headers
      if (!fullName) {
        const nameHeaderOptions = [
          document.querySelector('header section div > span'),
          document.querySelector('header section > div:first-child > span'),
          document.querySelector('section > div:first-child > span')
        ];
        
        for (const element of nameHeaderOptions) {
          if (element && element.textContent.trim()) {
            fullName = element.textContent.trim();
            break;
          }
        }
      }

      // Extract counts from header stats
      let postsCount = 0, followersCount = 0, followingCount = 0;
      const statsItems = document.querySelectorAll('header section ul li, section > ul > li');
      
      for (const item of statsItems) {
        const text = item.textContent.trim();
        if (text.includes('post') || text.includes('Post')) {
          postsCount = parseCount(text);
        } else if (text.includes('follower') || text.includes('Follower')) {
          followersCount = parseCount(text);
        } else if (text.includes('following') || text.includes('Following')) {
          followingCount = parseCount(text);
        }
      }

      // IMPROVED BIO EXTRACTION: Use DOM structure to find bio
      let bio = '';
      
      // First attempt: Look for specific bio section
      const mainSection = document.querySelector('main section');
      if (mainSection) {
        // First, get all spans within the main section
        const spans = mainSection.querySelectorAll('span');
        
        // Filter spans that aren't part of the stats section
        const statsUl = mainSection.querySelector('ul');
        const potentialBioSpans = Array.from(spans).filter(span => {
          // Skip spans that are part of the stats
          if (statsUl && statsUl.contains(span)) return false;
          // Skip spans that contain the username
          if (span.textContent.includes(username)) return false;
          // Skip empty spans
          if (!span.textContent.trim()) return false;
          return true;
        });
        
        // If we found candidate spans, try to find the bio
        if (potentialBioSpans.length > 0) {
          // Look for spans with reasonable bio content
          for (const span of potentialBioSpans) {
            const text = span.textContent.trim();
            // Skip likely non-bio content
            if (text === fullName || text === username) continue;
            if (text.includes('post') || text.includes('follower') || text.includes('following')) continue;
            
            // If we found something reasonable, use it
            if (text.length > 0) {
              bio = text;
              break;
            }
          }
        }
      }
      
      // Second attempt: Try to find bio through context
      if (!bio) {
        // Look for elements after the username/fullname but before the stats section
        const header = document.querySelector('header');
        if (header) {
          const allElements = header.querySelectorAll('div, span, p');
          let foundNameOrUsername = false;
          
          for (const el of allElements) {
            const text = el.textContent.trim();
            
            // Skip empty elements
            if (!text) continue;
            
            // Check if we've found the username or fullname
            if (text === username || text === fullName) {
              foundNameOrUsername = true;
              continue;
            }
            
            // If we already found the name/username, the next non-empty text might be the bio
            if (foundNameOrUsername && 
                !text.includes('post') && 
                !text.includes('follower') && 
                !text.includes('following')) {
              bio = text;
              break;
            }
          }
        }
      }

      // Get posts from the profile grid
      const postElements = document.querySelectorAll('article a[href*="/p/"], main article a[href*="/p/"]');
      const posts = Array.from(postElements)
        .slice(0, 12) // Limit to 12 posts
        .map((el, index) => {
          const img = el.querySelector('img');
          const url = el.getAttribute('href') || '';
          
          return {
            id: `post-${index}`,
            url: url.startsWith('http') ? url : `https://www.instagram.com${url}`,
            thumbnailUrl: img ? img.src : '',
            caption: img ? img.alt : '',
            likes: 0,    // To be updated below
            comments: 0  // To be updated below
          };
        })
        .filter(post => post.thumbnailUrl);

      return {
        username,
        fullName,
        profilePicUrl,
        bio,
        postsCount,
        followersCount,
        followingCount,
        posts
      };
    });
    
    console.log('Fetched profile data, now processing posts...');
    
    // For each post, visit its page to extract likes and comments
    for (let i = 0; i < Math.min(profileData.posts.length, 12); i++) {
      const post = profileData.posts[i];
      try {
        console.log(`Processing post ${i+1}/${Math.min(profileData.posts.length, 12)}: ${post.url}`);
        
        const postPage = await browser.newPage();
        await postPage.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/119.0.0.0 Safari/537.36'
        );
        await postPage.goto(post.url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait longer for the post to load fully
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Wait for the post's article element to load
        await postPage.waitForSelector('article', { timeout: 15000 });
        
       // Inside your post page evaluation code, replace the counts extraction with this
const counts = await postPage.evaluate(() => {
  let likeCount = 0, commentCount = 0;
  
  // APPROACH 1: Extract from og:description meta tag (most reliable)
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    const content = ogDescription.getAttribute('content') || '';
    
    // The format is typically: "X likes, Y comments - username on Date: "Post text..."
    const metaMatch = content.match(/(\d+(?:,\d+)*)\s+likes?,\s+(\d+(?:,\d+)*)\s+comments?/i);
    if (metaMatch) {
      likeCount = parseInt(metaMatch[1].replace(/,/g, ''));
      commentCount = parseInt(metaMatch[2].replace(/,/g, ''));
      return { likeCount, commentCount }; // Return early if we found reliable data
    }
  }
  
  // APPROACH 2: Extract from page title or other meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const titleContent = ogTitle.getAttribute('content') || '';
    const titleMatch = titleContent.match(/(\d+(?:,\d+)*)\s+likes?,\s+(\d+(?:,\d+)*)\s+comments?/i);
    if (titleMatch) {
      likeCount = parseInt(titleMatch[1].replace(/,/g, ''));
      commentCount = parseInt(titleMatch[2].replace(/,/g, ''));
      return { likeCount, commentCount }; // Return early if we found reliable data
    }
  }
  
  // APPROACH 3: Fallback to DOM parsing if meta tags don't have the info
  const extractNumber = (str) => {
    if (!str) return 0;
    str = str.toLowerCase().trim();
    
    // Extract just the part that looks like a count
    const countMatch = str.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*([km])?/i);
    if (!countMatch) return 0;
    
    const numericPart = parseFloat(countMatch[1].replace(/,/g, ''));
    const suffix = countMatch[2] ? countMatch[2].toLowerCase() : '';
    
    // Apply multiplier if suffix exists
    if (suffix === 'k') {
      return Math.round(numericPart * 1000);
    } else if (suffix === 'm') {
      return Math.round(numericPart * 1000000);
    } else {
      return Math.round(numericPart);
    }
  };
  
  // Look for specific text patterns for likes
  const likeElements = Array.from(document.querySelectorAll('span, div, a, button'))
    .filter(el => {
      const text = el.textContent.trim().toLowerCase();
      return text.includes('like') && 
             text.match(/\d+/) && 
             !text.includes('comment');
    });
  
  for (const el of likeElements) {
    const extracted = extractNumber(el.textContent);
    if (extracted > likeCount && extracted < 100000000) { // Sanity check
      likeCount = extracted;
    }
  }
  
  // Look for specific text patterns for comments
  const commentElements = Array.from(document.querySelectorAll('span, div, a, button'))
    .filter(el => {
      const text = el.textContent.trim().toLowerCase();
      return text.includes('comment') && 
             text.match(/\d+/) && 
             !text.includes('like');
    });
  
  for (const el of commentElements) {
    const extracted = extractNumber(el.textContent);
    if (extracted > commentCount && extracted < 10000000) { // Sanity check
      commentCount = extracted;
    }
  }
  
  // If comment count is still 0, try counting visible comments
  if (commentCount === 0) {
    const commentLists = document.querySelectorAll('ul[class*="comment"], div[aria-label*="comment"] ul');
    if (commentLists.length > 0) {
      const comments = commentLists[0].querySelectorAll('li');
      commentCount = Math.max(0, comments.length - 1); // Subtract 1 to exclude potential header
    }
  }
  
  return { likeCount, commentCount };
});
        
        post.likes = counts.likeCount;
        post.comments = counts.commentCount;
        await postPage.close();
      } catch (err) {
        console.error(`Error scraping post ${post.url}:`, err);
      }
    }
    
    return profileData;
  } catch (error) {
    console.error('Error scraping Instagram profile:', error);
    throw new Error('Failed to load Instagram profile: ' + error.message);
  } finally {
    await browser.close();
  }
}

(async () => {
  // Get Instagram username from command-line arguments or default to "instagram"
  const username = process.argv[2] || 'instagram';
  console.log(`Scraping Instagram profile for "${username}"...`);
  
  try {
    const data = await scrapeInstagramProfile(username);
    
    // Ensure the public folder exists (create if needed)
    const publicFolder = path.join(__dirname, 'public');
    if (!fs.existsSync(publicFolder)) {
      fs.mkdirSync(publicFolder);
    }
    
    // Write the scraped data to public/instaurl.json
    const filePath = path.join(publicFolder, 'instaurl.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
  } catch (err) {
    console.error('Scraping failed:', err);
  }
})();