import { NetworkAccessError } from "./NetworkAccessError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;

interface Transformation {
  transformation: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  url: string;
  secure_url: string;
}

interface UploadResponse {
  asset_id: string;
  public_id: string;
  version: string;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: Date;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  colors?: Record<string, number>[];
  predominant?: {
    google: Record<string, number>[];
    cloudinary: Record<string, number>[];
  };
  original_filename: string;
  eager?: Transformation[];
  api_key?: string;
}

interface DestoryResponse {
  result: string;
}

class CloudinaryClient {
  static readonly BASE_PATH = "https://api.cloudinary.com/v1_1/";

  public constructor(
    private cloudName: string,
    private apiKey: string,
    private apiSecret: string
  ) {}

  /**
   * @param {string} file remote FTP, HTTP or HTTPS URL of an existing file
   * @param {Record<string, any>} [options]
   * @return {UploadResponse}
   * @throws {NetworkAccessError}
   */
  public upload(file: string, options?: Record<string, any>): UploadResponse {
    const endPoint = this.getEndpoint("image/upload");

    const payload = {
      file,
      ...options
    };

    return this.invokeAPI(endPoint, this.signParameters(payload));
  }

  /**
   * @param {string} file remote FTP, HTTP or HTTPS URL of an existing file
   * @param {string} upload_preset
   * @return {UploadResponse}
   * @throws {NetworkAccessError}
   */
  public unsignedUpload(file: string, upload_preset: string): UploadResponse {
    const endPoint = this.getEndpoint("image/upload");

    const payload = {
      file,
      upload_preset
    };

    return this.invokeAPI(endPoint, payload);
  }

  /**
   * @param {string} public_id The identifier of the uploaded asset.
   * @param {Record<string, any>} [options]
   * @return {DestoryResponse}
   * @throws {NetworkAccessError}
   */
  public destroy(
    public_id: string,
    options?: Record<string, any>
  ): DestoryResponse {
    const endPoint = this.getEndpoint("image/destroy");

    const payload = {
      public_id,
      ...options
    };

    return this.invokeAPI(endPoint, this.signParameters(payload));
  }

  private computeHash(seeds: string): string {
    const rawHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_1,
      seeds,
      Utilities.Charset.UTF_8
    );

    return rawHash.reduce((digest: string, byte: number) => {
      if (byte < 0) {
        byte += 256;
      }
      if (byte.toString(16).length === 1) {
        digest += "0";
      }
      digest += byte.toString(16);

      return digest;
    }, "");
  }

  private signParameters(parameters: Record<string, any>): Record<string, any> {
    const timestamp = Math.round(Date.now() / 1000).toString(10);

    const signedParameters = {
      ...parameters,
      timestamp
    };

    const serializedParameters = Object.entries(signedParameters)
      .filter(
        ([k, v]) =>
          !["file", "cloud_name", "resource_type", "api_key"].includes(k)
      )
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("&");

    const signature = this.computeHash(serializedParameters + this.apiSecret);

    return {
      ...signedParameters,
      api_key: this.apiKey,
      signature
    };
  }

  /**
   * @param {string} endPoint Cloudinary API endpoint
   * @param {{}} options
   * @return {any}
   * @throws {NetworkAccessError}
   */
  private invokeAPI(endPoint: string, payload: {}): any {
    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(endPoint, this.postRequestOptions(payload));
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        return JSON.parse(response.getContentText());
      default:
        console.warn(
          `Cloudinary API error. endpoint: ${endPoint}, method: post, status: ${response.getResponseCode()}, content: ${response.getContentText()}, payload: ${JSON.stringify(
            payload
          )}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private postRequestOptions(payload: string | {}): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "post",
      muteHttpExceptions: true,
      payload
    };

    return options;
  }

  private getEndpoint(method: string): string {
    return `${CloudinaryClient.BASE_PATH}${this.cloudName}/${method}`;
  }
}
export { CloudinaryClient, UploadResponse };
