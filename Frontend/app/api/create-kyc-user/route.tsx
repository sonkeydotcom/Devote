import axios from "axios";
import crypto from "crypto";
import { NextResponse } from "next/server";

const SUMSUB_BASE_URL = "https://api.sumsub.com";
const SUMSUB_APP_TOKEN = process.env.SUMSUB_TOKEN ?? "";
const SUMSUB_SECRET_KEY = process.env.SUMSUB_API_KEY ?? "";

axios.defaults.baseURL = SUMSUB_BASE_URL;
axios.interceptors.request.use(createSignature, function (error: any) {
  return Promise.reject(error);
});

// This function creates a signature for the request
function createSignature(config: any) {
  console.log("Creating a signature for the creating user request...");
  const timestamp = Math.floor(Date.now() / 1000);
  const method = config.method.toUpperCase();
  const url =
    new URL(config.url, SUMSUB_BASE_URL).pathname +
    new URL(config.url, SUMSUB_BASE_URL).search;
  console.log("url", url);

  const signature = crypto.createHmac("sha256", SUMSUB_SECRET_KEY);
  signature.update(`${timestamp}${method}${url}`);

  if (config.data) {
    const dataString = JSON.stringify(config.data);
    signature.update(dataString);
  }

  config.headers["X-App-Token"] = SUMSUB_APP_TOKEN;
  config.headers["X-App-Access-Sig"] = signature.digest("hex");
  config.headers["X-App-Access-Ts"] = timestamp.toString();
  console.log("Finish signature config", config);
  return config;
}

export async function POST(req: Request): Promise<NextResponse | void> {
  try {
    const body = await req.json();
    const { userId, userEmail }: { userId: string; userEmail: string } = body;
    const requestUri = `/resources/applicants`;

    const options = {
      method: "POST",
      url: `${SUMSUB_BASE_URL}${requestUri}?levelName=BasicLevel`,
      headers: {
        "content-type": "application/json",
      },
      data: {
        externalUserId: userId,
        email: userEmail,
        fixedInfo: {
          country: "CRI",
        },
      },
    };

    console.log("options", options);
    const response = await axios.request(options);
    console.log("response", response);

    console.log("API response data:", response.data);
    return NextResponse.json(response.data, {
      status: 200,
    });
  } catch (error: any) {
    console.error(
      "Error requesting data:",
      error?.response?.data || error.message
    );

    if (error?.response?.data.description === "Applicant not found") {
      return NextResponse.json(
        { error: "Error Application not found KYC" },
        {
          status: 404,
        }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
      }
    );
  }
}
