import expess from "express";
import uploadFile, { isAuth } from "../middleware/middleware.js";
import {
  addAlbum,
  addSong,
  addThumbnail,
  deleteAlbum,
  deleteSong,
} from "../controller/controller.js";

const adminRouter = expess.Router();

adminRouter
  .post("/album/new", isAuth, uploadFile, addAlbum)
  .post("/song/new", isAuth, uploadFile, addSong)
  .post("/song/:id", isAuth, uploadFile, addThumbnail)
  .delete("/album/:id", isAuth, deleteAlbum)
  .delete("/song/:id", isAuth, deleteSong);

export default adminRouter;
