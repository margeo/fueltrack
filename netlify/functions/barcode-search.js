import { parseBarcode } from "./food-parsers.js";
import { withCors } from "./_cors.js";

export const handler = withCors(async function handler(event) {
  try {
    const barcode = event.queryStringParameters?.code?.trim();

    if (!barcode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing barcode" })
      };
    }

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.ok) {
      throw new Error(`OFF error: ${response.status}`);
    }

    const data = await response.json();
    const food = parseBarcode(data, barcode);

    return {
      statusCode: 200,
      body: JSON.stringify(food)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
});