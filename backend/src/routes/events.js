import { Router } from "express";
import { parseBlockQuery } from "../config.js";
import { fetchEvents } from "../services/events.js";

const router = Router();

router.get("/events", async (req, res, next) => {
  try {
    const fromBlock = parseBlockQuery(req.query.from, "from");
    const toBlock = parseBlockQuery(req.query.to, "to");

    const events = await fetchEvents(fromBlock, toBlock);
    res.json({
      events,
      count: events.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
