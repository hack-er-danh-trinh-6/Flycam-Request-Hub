import { Router, type IRouter } from "express";
import healthRouter from "./health";
import requestsRouter from "./requests";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requestsRouter);
router.use(adminRouter);

export default router;
