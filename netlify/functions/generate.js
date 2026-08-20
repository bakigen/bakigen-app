exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { base64Image, mediaType, taille, etat } = JSON.parse(event.body);

    if (!base64Image || !mediaType) {
      return { statusCode: 400, body: JSON.stringify({ error: "Image manquante" }) };
    }

    const prompt = `Tu es un expert Vinted. Regarde cette photo de vêtement/article et génère une annonce optimisée pour Vinted. La taille est "${taille}" et l'état déclaré par le vendeur est "${etat}" — utilise ces informations telles quelles, ne les invente pas. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour, avec exactement ces clés : {"titre": "...", "description": "...", "prix": "XX€"}. Le titre doit être accrocheur et contenir la marque si visible, la taille, et l'état. La description doit reprendre la taille et l'état donnés, lister les matières si visible, les défauts éventuels visibles sur la photo, et donner envie d'acheter. Le prix doit être une estimation réaliste de revente sur Vinted en euros, cohérente avec l'état indiqué.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data }) };
    }

    const text = data.content.map((b) => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
