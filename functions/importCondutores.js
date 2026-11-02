const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const db = getFirestore();
const IMPORT_TOKEN = "eixosp-import-condutores-20261102";

function decodeValue(value) {
  if (value && typeof value === "object" && value.__type === "timestamp") {
    return Timestamp.fromDate(new Date(value.value));
  }
  return value;
}

exports.importCondutores = onRequest(
  { region: "southamerica-east1", maxInstances: 1, timeoutSeconds: 540, memory: "1GiB" },
  async (req, res) => {
    if (req.method !== "POST" || req.get("x-import-token") !== IMPORT_TOKEN) {
      res.status(404).send("Not found");
      return;
    }
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length || rows.length > 500) {
      res.status(400).json({ error: "Envie entre 1 e 500 registros por lote." });
      return;
    }
    const batch = db.batch();
    for (const row of rows) {
      const id = String(row.__docId || "").trim();
      if (!id) {
        res.status(400).json({ error: "Registro sem __docId." });
        return;
      }
      const data = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== "__docId") data[key] = decodeValue(value);
      }
      batch.set(db.collection("condutores").doc(id), data, { merge: true });
    }
    await batch.commit();
    res.json({ imported: rows.length, first: rows[0].__docId, last: rows[rows.length - 1].__docId });
  },
);
