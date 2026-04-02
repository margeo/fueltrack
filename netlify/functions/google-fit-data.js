export async function handler(event) {
  const accessToken = event.queryStringParameters?.token;
  const date = event.queryStringParameters?.date || new Date().toISOString().slice(0, 10);

  if (!accessToken) {
    return { statusCode: 401, body: JSON.stringify({ error: "No token" }) };
  }

  try {
    const [year, month, day] = date.split("-").map(Number);
    const startMs = new Date(year, month - 1, day, 0, 0, 0).getTime();
    const endMs = new Date(year, month - 1, day, 23, 59, 59).getTime();

    const body = {
      aggregateBy: [
        { dataTypeName: "com.google.step_count.delta" },
        { dataTypeName: "com.google.distance.delta" },
        { dataTypeName: "com.google.calories.expended" }
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs
    };

    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    let steps = 0;
    let distanceMeters = 0;
    let calories = 0;

    for (const bucket of data.bucket || []) {
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          for (const val of point.value || []) {
            if (dataset.dataSourceId.includes("step_count")) steps += val.intVal || 0;
            if (dataset.dataSourceId.includes("distance")) distanceMeters += val.fpVal || 0;
            if (dataset.dataSourceId.includes("calories")) calories += val.fpVal || 0;
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: Math.round(steps),
        distanceKm: Math.round(distanceMeters / 10) / 100,
        calories: Math.round(calories)
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}