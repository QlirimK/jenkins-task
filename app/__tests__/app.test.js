import request from "supertest";
import express from "express";

const app = express();
app.get("/", (_req, res) => res.json({ message: "Hello from Qlirim DevOps Pipeline!" }));

test("GET / returns message", async () => {
  const res = await request(app).get("/");
  expect(res.status).toBe(200);
  expect(res.body.message).toMatch(/Hello from Qlirim/);
});
