import { Router } from "express";
const router = Router();

// /logout に対する GET 処理。
// ログアウト処理。
router.get("/", (req, res) => {
  if (req.session.user) {
    req.session.destroy();
  }
  res.redirect("/");
});

export default router;