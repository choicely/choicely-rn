const TLD_LIST = [
  'COM',
  'DE',
  'NET',
  'ORG',
  'UK',
  'CN',
  'GA',
  'NL',
  'RU',
  'TK',
  'BR',
  'XYZ',
  'INFO',
  'AU',
  'FR',
  'PL',
  'IT',
  'CA',
  'CH',
  'US',
  'EU',
  'BIZ',
  'JP',
  'IN',
  'ES',
  'SE',
  'AT',
  'BE',
  'ME',
  'CZ',
  'DK',
  'KR',
  'MX',
  'CO',
  'AI',
  'IO',
  'TV',
  'ASIA',
  'ID',
  'PT',
  'NO',
  'NU',
  'VN',
  'AR',
  'MOBI',
  'HU',
  'RO',
  'IR',
  'ZA',
  'APP',
  'CL',
  'LT',
  'SK',
  'GR',
  'UA',
  'TW',
  'ICU',
  'SG',
  'ONLINE',
  'SHOP',
  'SITE',
  'HK',
  'BY',
  'KZ',
  'IE',
  'DEV',
  'STORE',
  'PH',
  'WEBSITE',
  'NZ',
  'LV',
  'CLUB',
  'MY',
  'TOP',
  'BG',
  'SI',
  'AE',
  'EE',
  'TH',
  'ART',
  'RS',
  'VIP',
  'IS',
  'LU',
  'SPACE',
  'PE',
  'VE',
  'BLOG',
  'AM',
  'RED',
  'PRO',
  'PK',
  'DESIGN',
  'NYC',
  'TECH',
  'SA',
  'CAT',
  'TR',
  'CLOUD',
  'AFRICA',
  'LINK',
  'GG',
  'HR',
  'UZ',
  'LIVE',
  'NG',
  'WORK',
  'NAME',
  'IL',
  'MA',
  'FM',
  'STUDIO',
  'AGENCY',
  'WS',
  'NEWS',
  'CY',
  'CC',
  'GE',
  'ONE',
  'PW',
  'HELP',
  'GLOBAL',
  'COMPANY',
  'SHOW',
  'MARKETING',
  'TODAY',
  'NETWORK',
  'LIFE',
  'SOLUTIONS',
  'EMAIL',
  'PHOTOS',
  'SYSTEMS',
  'GURU',
  'WIKI',
  'VIDEO',
  'SERVICES',
  'GROUP',
  'TIPS',
  'ZONE',
  'WORLD',
  'FINANCE',
  'SOCIAL',
  'BZ',
  'CITY',
  'LONDON',
  'BIO',
  'LA',
  'CAFE',
  'SUPPORT',
  'TECHNOLOGY',
  'CO-UK'
]

/**
 * URL utility functions for extracting and processing URLs in text
 */

/**
 * Extracts unique, cleaned URLs from a given text message.
 * Optimized for performance and enhanced for React rendering.
 *
 * @param {string} text - The input text potentially containing URLs
 * @returns {Object} - Contains urlList and urlPositions for rendering
 */
function extractUrls(text) {
  // Early return for empty input
  if (!text) {
    return { urlList: [], urlPositions: [], textParts: [text] }
  }

  // --- Constants and Data Structures ---
  const foundUrls = []
  const urlPositions = []
  const domainToUrlMap = new Map()
  const processedRanges = new Set()

  // TLD list for validating bare domains

  const escapeRegex = string => string.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')
  const tldPattern = TLD_LIST.map(escapeRegex).join('|')

  // --- Create Regex Patterns ---
  // Using smaller, more targeted patterns for better maintainability
  const patterns = {
    html: /<a\s+[^>]*href\s*=\s*['"]([^'"\s]+)['"][^>]*>/gi,
    markdown: /\[[^\]]+\]\(([^()]+(?:\([^()]*\)[^()]*)*)\)/g,
    standardUrl: new RegExp(
      `(?:(?:https?|ftp):\\/\\/|[wW]{3}\\.)` +
        `(?:(?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]{0,61}[\\p{L}\\p{N}])?\\.)+[\\p{L}]{2,63}|localhost|\\d{1,3}(?:\\.\\d{1,3}){3})` +
        `(?::\\d+)?` +
        `(?:[\\/\\?#][^\\s"<>']*)?`,
      'giu'
    ),
    urlWithQuery: /(\w+\.\w+\/[^\s]*\?[^\s.,]*)/g,
    bareDomain: new RegExp(
      `(?:^|(?<=[\\s\\(\\[<'":;,=]))` +
        `(` +
        `(?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]{0,61}[\\p{L}\\p{N}])?\\.)+` +
        `(?:${tldPattern})` +
        `(?:\\/[^\\s.,!?;:&>'")\\]/]*)?` +
        `)` +
        `(?=$|[\\s.,!?;:&>'")\\]/])`,
      'giu'
    )
  }

  // Fallback regex if Unicode not supported
  try {
    // Test if the regex works
    patterns.standardUrl.test('test')
  } catch (e) {
    patterns.standardUrl =
      /(?:(?:https?|ftp):\/\/|www\.)(?:(?:[\w-]+\.)+[a-zA-Z]{2,}|localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#][^\s"<>']*)?/gi
  }

  try {
    patterns.bareDomain.test('test')
  } catch (e) {
    patterns.bareDomain = `/(?:^|(?<=[s([<'":;,=]))((?:[w](?:[w-]{0,61}[w])?.)+(?:com|org|net|edu|gov|mil|co|io|xyz|info)(?:/[^s.,!?;:&>'")\\]/]*)?)(?=$|[s.,!?;:&>'")\\]/])/gi`
  }

  // --- Helper Functions ---
  /**
   * Cleans a URL and ensures it has a proper scheme
   */
  function processUrl(url, isMarkdown = false) {
    if (!url) return url

    // Clean the URL first
    let cleaned = isMarkdown ? cleanMarkdownUrl(url) : cleanUrl(url)

    // Add https:// prefix if missing
    if (cleaned && !/^(?:https?|ftp):\/\//i.test(cleaned)) {
      if (/^[wW]{3}\./i.test(cleaned)) {
        cleaned = `https://${cleaned}`
      } else if (/^[^/]+\.[^/]+/.test(cleaned)) {
        // Only add prefix for valid domain patterns
        cleaned = `https://${cleaned}`
      }
    }

    return cleaned
  }

  /**
   * Standard URL cleaning function
   */
  function cleanUrl(url) {
    if (!url) return url
    let cleaned = url.trim()

    // Handle question mark at the end of path
    if (cleaned.endsWith('?')) {
      cleaned = cleaned.slice(0, -1)
    } else if (cleaned.includes('?')) {
      // Preserve query strings but remove trailing punctuation
      cleaned = cleaned.replace(/[.,!;:"')\]>]+$/, '')
    } else {
      // For URLs without query parameters
      cleaned = cleaned.replace(/[.,!;:"')\]>]+$/, '')
    }

    return cleaned.trim()
  }

  /**
   * Special cleaning for Markdown URLs with nested parentheses
   */
  function cleanMarkdownUrl(url) {
    if (!url) return url
    let cleaned = url.trim()

    // Handle nested parentheses
    let openCount = 0
    let closeCount = 0

    for (const char of cleaned) {
      if (char === '(') openCount++
      else if (char === ')') closeCount++
    }

    if (cleaned.includes('(') && cleaned.endsWith(')')) {
      if (openCount < closeCount) {
        // Remove only excess closing parentheses
        cleaned = cleaned.slice(0, -(closeCount - openCount))
      }
    } else {
      // General trailing punctuation cleanup
      cleaned = cleaned.replace(/[.,!;:"')\]>]+$/, '')
    }

    return cleaned.trim()
  }

  /**
   * Extracts domain for comparison
   */
  function extractDomain(url) {
    const domainMatch = url.match(/^(?:https?:\/\/|[wW]{3}\.)?([^/]+)/)
    return domainMatch ? domainMatch[1].toLowerCase() : ''
  }

  /**
   * Checks if a range overlaps with existing processed ranges
   */
  function isRangeProcessed(start, end) {
    for (const range of processedRanges) {
      const [rangeStart, rangeEnd] = range.split('-').map(Number)
      if (
        (start >= rangeStart && start < rangeEnd) ||
        (end > rangeStart && end <= rangeEnd) ||
        (start <= rangeStart && end >= rangeEnd)
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Records a processed range
   */
  function markRangeProcessed(start, end) {
    processedRanges.add(`${start}-${end}`)
  }

  /**
   * Adds a URL to the results with proper sorting and positioning
   */
  function addUrlWithPosition(url, start, end) {
    if (!url) return

    // Skip if range is already processed
    if (isRangeProcessed(start, end)) return

    const domain = extractDomain(url)
    if (!domain) return

    const lowerDomain = domain.toLowerCase()

    // Handle URL priority
    if (domainToUrlMap.has(lowerDomain)) {
      const existingIndex = domainToUrlMap.get(lowerDomain)
      const existingUrl = foundUrls[existingIndex]

      // Priority criteria
      const hasScheme = /^(?:https?|ftp):\/\//i.test(url)
      const hasWww = /^[wW]{3}\./i.test(url)
      const existingHasScheme = /^(?:https?|ftp):\/\//i.test(existingUrl)
      const existingHasWww = /^[wW]{3}\./i.test(existingUrl)

      if ((hasScheme && !existingHasScheme) || (hasWww && !existingHasWww)) {
        // Replace with higher priority version
        foundUrls[existingIndex] = url
        urlPositions[existingIndex] = { start, end }
      } else if (
        !hasScheme &&
        !hasWww &&
        (existingHasScheme || existingHasWww)
      ) {
        return // Skip if lower priority
      } else if (url.length > existingUrl.length) {
        // Replace with more complete URL
        foundUrls[existingIndex] = url
        urlPositions[existingIndex] = { start, end }
      }
    } else {
      // Add new URL
      const index = foundUrls.length
      foundUrls.push(url)
      urlPositions.push({ start, end })
      domainToUrlMap.set(lowerDomain, index)
    }

    markRangeProcessed(start, end)
  }

  // --- Process URLs in Order of Priority ---

  // 1. HTML links
  let match
  while ((match = patterns.html.exec(text)) !== null) {
    if (match[1]) {
      const processedUrl = processUrl(match[1])
      addUrlWithPosition(
        processedUrl,
        match.index,
        match.index + match[0].length
      )
    }
  }

  // 2. Markdown links
  while ((match = patterns.markdown.exec(text)) !== null) {
    if (match[1]) {
      const processedUrl = processUrl(match[1], true)
      addUrlWithPosition(
        processedUrl,
        match.index,
        match.index + match[0].length
      )
    }
  }

  // 3. Standard URLs
  while ((match = patterns.standardUrl.exec(text)) !== null) {
    const processedUrl = processUrl(match[0])
    addUrlWithPosition(processedUrl, match.index, match.index + match[0].length)
  }

  // 4. URLs with query parameters
  while ((match = patterns.urlWithQuery.exec(text)) !== null) {
    if (
      match[1] &&
      !isRangeProcessed(match.index, match.index + match[1].length)
    ) {
      const processedUrl = processUrl(match[1])
      addUrlWithPosition(
        processedUrl,
        match.index,
        match.index + match[1].length
      )
    }
  }

  // 5. Bare domains (lowest priority)
  while ((match = patterns.bareDomain.exec(text)) !== null) {
    const bareDomain = match[1]

    // Skip if already processed or starts with www
    if (
      isRangeProcessed(match.index, match.index + bareDomain.length) ||
      /^[wW]{3}\./.test(bareDomain)
    ) {
      continue
    }

    const domain = extractDomain(bareDomain)
    if (domainToUrlMap.has(domain)) {
      const existingIndex = domainToUrlMap.get(domain)
      const existingUrl = foundUrls[existingIndex]
      if (existingUrl.includes(bareDomain)) {
        continue // Skip if part of existing URL
      }
    }

    const processedUrl = processUrl(bareDomain)
    addUrlWithPosition(
      processedUrl,
      match.index,
      match.index + bareDomain.length
    )
  }

  // --- Generate text parts for React component ---
  // Sort positions by start index
  const sortedPositions = [...urlPositions].sort((a, b) => a.start - b.start)

  // Create text segments
  const textParts = []
  let lastEnd = 0

  for (const pos of sortedPositions) {
    // Add text before this URL
    if (pos.start > lastEnd) {
      textParts.push(text.substring(lastEnd, pos.start))
    }

    // Mark position for URL (use null as placeholder)
    textParts.push(null)
    lastEnd = pos.end
  }

  // Add final text segment if needed
  if (lastEnd < text.length) {
    textParts.push(text.substring(lastEnd))
  }

  return {
    urlList: foundUrls,
    urlPositions: sortedPositions,
    textParts
  }
}

/**
 * Builds clickable text content with embedded URLs
 * @param {string} text - Original text
 * @param {function} linkRenderer - Function to render URL links
 * @returns {Array} Array of text and link elements
 */
function buildTextWithLinks(text, linkRenderer) {
  const { urlList, textParts } = extractUrls(text)

  // Create result with interleaved text and URL components
  return textParts.map((part, index) => {
    if (part === null) {
      // Render URL component
      const urlIndex = textParts.filter(
        (p, i) => p === null && i < index
      ).length
      return linkRenderer(urlList[urlIndex], urlIndex)
    }
    // Render plain text
    return part
  })
}

export { extractUrls, buildTextWithLinks }
