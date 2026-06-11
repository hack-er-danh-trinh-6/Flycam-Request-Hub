import { Router, type IRouter } from "express";
import healthRouter from "./health";
import requestsRouter from "./requests";
import adminRouter from "./admin";
import authRouter from "./auth";
import mapConfigRouter from "./mapConfig";
import maintenanceRouter from "./maintenance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requestsRouter);
router.use(authRouter);
router.use(mapConfigRouter);
router.use(maintenanceRouter);
router.use(adminRouter);

export default router;
