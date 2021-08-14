import { CloudinaryClient } from "../src/CloudinaryClient";
// require("@types/google-apps-script");

type DigestAlgorithm = GoogleAppsScript.Utilities.DigestAlgorithm;

let response: {};

describe("CloudinaryClient", () => {
  beforeAll(() => {
    UrlFetchApp.fetch = jest.fn().mockImplementation((url) => {
      return {
        getResponseCode: jest.fn(() => {
          return 200;
        }),
        getContentText: jest.fn(() => {
          return JSON.stringify(response);
        })
      };;
    });;

    Utilities.computeDigest = jest.fn().mockImplementation((algorithm, value, charset) => {
      return [1, 2, 3];
    });
    jest.spyOn(Utilities, "computeDigest");
    jest.spyOn(UrlFetchApp, "fetch");
  });
  describe("upload", () => {
    it("success", () => {
      response = { ok: true };
      const client = new CloudinaryClient("", "", "");
      const actual = client.upload("https://via.placeholder.com/350x150");
      expect(actual).toBe(response);
    });
  });
});
