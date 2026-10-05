export default function ({
  db,
  router,
  run,
  get,
  all,
  tx,
  id,
  text,
  required,
  fail,
}) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS appointments(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),date TEXT,slot TEXT,name TEXT,status TEXT DEFAULT 'booked');CREATE UNIQUE INDEX IF NOT EXISTS active_slot ON appointments(date,slot) WHERE status='booked';`,
  );
  const slots = Array.from(
    { length: 16 },
    (_, i) =>
      `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  );
  const validDate = (d) => {
    const s = text(d, 10);
    const time = Date.parse(s + "T00:00:00Z");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== s
    )
      fail(422, "Geçersiz tarih");
    return s;
  };
  router.get("/slots", (req, res) => {
    const date = validDate(req.query.date);
    const used = all(
      "SELECT slot FROM appointments WHERE date=? AND status='booked'",
      date,
    ).map((x) => x.slot);
    res.json({
      zone: "Europe/Istanbul",
      date,
      slots: slots.map((time) => ({ time, available: !used.includes(time) })),
    });
  });
  router.get("/appointments", (req, res) =>
    res.json(
      all(
        "SELECT * FROM appointments WHERE owner=? ORDER BY date,slot",
        req.user.id,
      ),
    ),
  );
  router.post("/appointments", (req, res) => {
    const date = validDate(req.body.date),
      slot = text(req.body.slot, 5);
    if (!slots.includes(slot)) fail(422, "Çalışma saatleri dışında");
    if (Date.parse(`${date}T${slot}:00+03:00`) <= Date.now())
      fail(422, "Geçmiş zamana randevu alınamaz");
    const aid = id();
    run(
      "INSERT INTO appointments(id,owner,date,slot,name) VALUES(?,?,?,?,?)",
      aid,
      req.user.id,
      date,
      slot,
      text(req.body.name),
    );
    res.status(201).json({ id: aid, startsAt: `${date}T${slot}:00+03:00` });
  });
  router.delete("/appointments/:id", (req, res) => {
    required(
      get(
        "SELECT id FROM appointments WHERE id=? AND owner=?",
        req.params.id,
        req.user.id,
      ),
    );
    run("UPDATE appointments SET status='cancelled' WHERE id=?", req.params.id);
    res.json({ ok: true });
  });
}
