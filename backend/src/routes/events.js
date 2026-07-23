import { Router } from "express";
import { fetchEvents, getProcessedCount } from "../services/events.js";

const router = Router();

router.get("/events", async (req, res, next) => {
  try {
    const fromBlock = req.query.from
      ? BigInt(req.query.from)
      : undefined;
    const toBlock = req.query.to
      ? BigInt(req.query.to)
      : undefined;

    const events = await fetchEvents(fromBlock, toBlock);
    res.json({
      events,
      count: events.length,
      totalProcessed: getProcessedCount(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
