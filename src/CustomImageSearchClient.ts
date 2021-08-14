import { NetworkAccessError } from "./NetworkAccessError";

type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;

interface ImageItem {
  link: string;
  mime: string;
  height: number;
  width: number;
  thumbnailLink: string;
  thumbnailHeight: number;
  thumbnailWidth: number;
}

/**
 * Restricts the search to documents written in a particular language
 */
const DEFAULT_LANG = "lang_ja";
/**
 * Number of search results to return
 */
const NUM = 10;

class CustomImageSearchClient {
  public constructor(
    private apiKey: string,
    private searchEngineId: string,
    private locale?: string
  ) {}

  /**
   * @param {string} keyword Search word
   * @param {numger} [repeate=1] Number of invocations
   * @return {ImageItem[]}
   * @throws {NetworkAccessError}
   */
  public search(keyword: string, repeate = 1): ImageItem[] {
    const start: number = NUM * (repeate - 1) + 1;
    const options = {
      muteHttpExceptions: true
    };

    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(this.getEndpoint(keyword, start), options);
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200: {
        const items = JSON.parse(response.getContentText()).items;
        return items.map(item => {
          return {
            link: item.link,
            mime: item.mime,
            width: item.image.height,
            height: item.image.height,
            thumbnailLink: item.thumbnailLink,
            thumbnailHeight: item.thumbnailHeight,
            thumbnailWidth: item.thumbnailWidth
          } as ImageItem;
        });
      }
      default:
        console.warn(
          `Custom Search API error. status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private getEndpoint(keyword: string, start: number): string {
    return `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${
      this.searchEngineId
    }&searchType=image&q=${encodeURIComponent(
      keyword
    )}&safe=active&lr=${this.language()}&num=${NUM}&start=${start}`;
  }

  private language(): string {
    switch (this.locale) {
      case "ja-JP":
        return "lang_ja";
      case "en-US":
        return "lang_en";
      default:
        return DEFAULT_LANG;
    }
  }
}
export { CustomImageSearchClient, ImageItem };
