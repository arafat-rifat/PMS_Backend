import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { reportService } from './service';

const pickQueryString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : first?.toString();
  }
  return undefined;
};

export const reportController = {
  invoice: catchAsync(async (req: Request, res: Response) => {
    const from = req.query.from?.toString();
    const to = req.query.to?.toString();

    if (!from || !to) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'from and to query params are required (YYYY-MM-DD)',
      });
    }

    const data = await reportService.getInvoiceReport({
      projectId: req.query.projectId?.toString(),
      from,
      to,
    });

    return successResponse(res, data, 'Invoice report generated', StatusCodes.OK);
  }),

  dailyActivity: catchAsync(async (req: Request, res: Response) => {
    const data = await reportService.getDailyActivityReport({
      date: req.query.date?.toString(),
      projectId: req.query.projectId?.toString(),
      taskId: req.query.taskId?.toString(),
      userId: req.query.userId?.toString(),
    });

    return successResponse(res, data, 'Daily activity report generated', StatusCodes.OK);
  }),

  downloadDailyActivityPdf: catchAsync(async (req: Request, res: Response) => {
    const buffer = await reportService.getDailyActivityPdfBuffer({
      date: req.query.date?.toString(),
      projectId: req.query.projectId?.toString(),
      taskId: req.query.taskId?.toString(),
      userId: req.query.userId?.toString(),
      showStart: pickQueryString(req.query.showStart),
      showStop: pickQueryString(req.query.showStop),
      showCarryForward: pickQueryString(req.query.showCarryForward),
      showCumulativeHours: pickQueryString(req.query.showCumulativeHours),
      showNote: pickQueryString(req.query.showNote),
      showBlocker: pickQueryString(req.query.showBlocker),
      showReassignment: pickQueryString(req.query.showReassignment),
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="daily-activity-${fileDate}.pdf"`);
    res.status(StatusCodes.OK).send(buffer);
  }),
};
