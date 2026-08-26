module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { images, taille, etat } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Image manquante" });
    }
    if (images.some((img) => !img.base64Image || !img.mediaType)) {
      return res.status(400).json({ error: "Image invalide" });
    }

    const plural = images.length > 1;
    const prompt = `Tu es un expert Vinted. Regarde ${plural ? "ces photos" : "cette photo"} du même vêtement/article (${plural ? "plusieurs angles/détails de l'article" : "une seule photo"}) et génère une annonce optimisée pour Vinted. La taille est "${taille}" et l'état déclaré par le vendeur est "${etat}" — utilise ces informations telles quelles, ne les invente pas. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour, avec exactement ces clés : {"titre": "...", "description": "...", "prix": "XX€", "categorie": "...", "marque": "..."}. Le titre doit être accrocheur et contenir la marque si visible, la taille, et l'état. La description doit reprendre la taille et l'état donnés, lister les matières si visible, les défauts éventuels visibles sur ${plural ? "les photos" : "la photo"}, et donner envie d'acheter. Le prix doit être une estimation réaliste de revente sur Vinted en euros, cohérente avec l'état indiqué. Le champ "categorie" doit indiquer le chemin exact de catégorie Vinted à sélectionner dans leur arborescence (ex: "Femmes > Vêtements > Robes", "Hommes > Chaussures > Baskets", "Enfants > Fille > Manteaux et vestes"), en te basant sur le type d'article visible sur ${plural ? "les photos" : "la photo"} et, si la marque est identifiable, sur le rayon habituel de cette marque sur Vinted (ex: une marque de sport ira plutôt en "Vêtements de sport"). Le champ "marque" doit contenir la marque détectée, ou "Non identifiée" si tu ne peux pas la déterminer avec certitude.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              ...images.map((img) => ({
                type: "image",
                source: { type: "base64", media_type: img.mediaType, data: img.base64Image },
              })),
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data.content.map((b) => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
