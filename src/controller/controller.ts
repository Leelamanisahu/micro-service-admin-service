import getBuffer from "../config/datauri.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import cloudinary from "cloudinary";
import { sql } from "../config/db.js";
import { redisClient } from "../index.js";

interface AuthenticationRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

export const addAlbum = asyncHandler(
  async (req: AuthenticationRequest, res: Response) => {
    if (req.user?.role !== "admin") {
      res.status(401).json({ message: "Access denied" });
      return;
    }

    const { title, description } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer || !fileBuffer.content) {
      res.status(500).json({ message: "Error processing file" });
      return;
    }

    const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
      folder: "albums",
    });

    const result = await sql`
    INSERT INTO albums (title, description, thumbnail) VALUES (
      ${title},${description},${cloud.secure_url}) RETURNING *
    `;

    if (redisClient.isReady) {
      await redisClient.del("albums");
      console.log("Albums cache cleared");
    }

    res.status(201).json({
      message: "Album created successfully",
      album: result[0],
    });
  }
);

export const addSong = asyncHandler(
  async (req: AuthenticationRequest, res: Response) => {
    if (req.user?.role !== "admin") {
      res.status(401).json({ message: "Access denied" });
      return;
    }

    const { title, description, album } = req.body;

    const isAlbum = await sql`
      SELECT * FROM albums WHERE id = ${album}`;

    if (isAlbum.length === 0) {
      res.status(404).json({ message: "Album not found" });
      return;
    }

    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    const fileBuffer = getBuffer(file);
    if (!fileBuffer || !fileBuffer.content) {
      res.status(500).json({ message: "Error processing file" });
      return;
    }

    const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
      folder: "songs",
      resource_type: "video",
    });

    const result = await sql`
        INSERT INTO songs(title, description, audio, album_id) VALUES (
          ${title}, ${description}, ${cloud.secure_url}, ${album})
    `;

    if (redisClient.isReady) {
      await redisClient.del("songs");
      console.log("songs cache cleared");

      await redisClient.del(`album_songs_${album}`);
      console.log(`album_songs_${album} cache cleared`);
    }
    res.status(201).json({
      message: "Song added successfully",
    });
  }
);

export const addThumbnail = asyncHandler(
  async (req: AuthenticationRequest, res: Response) => {
    if (req.user?.role !== "admin") {
      res.status(401).json({ message: "Access denied" });
      return;
    }
    const songs = await sql` SELECT * FROM songs WHERE id = ${req.params.id}`;

    if (songs.length === 0) {
      res.status(404).json({ message: "Song not found" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    const fileBuffer = getBuffer(file);
    if (!fileBuffer || !fileBuffer.content) {
      res.status(500).json({ message: "Error processing file" });
      return;
    }

    const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content);

    const result =
      await sql` UPDATE songs SET thumbnail = ${cloud.secure_url} WHERE id = ${req.params.id} RETURNING *`;

    if (redisClient.isReady) {
      await redisClient.del("songs");
      console.log("songs cache cleared");
    }

    res.status(200).json({
      message: "Thumbnail added successfully",
      song: result[0],
    });
  }
);

export const deleteAlbum = asyncHandler(
  async (req: AuthenticationRequest, res: Response) => {
    if (req.user?.role !== "admin") {
      res.status(401).json({ message: "Access denied" });
      return;
    }
    const { id } = req.params;

    const isAlbum = await sql`
      SELECT * FROM albums WHERE id = ${id}`;

    if (isAlbum.length === 0) {
      res.status(404).json({ message: "Album not found" });
      return;
    }

    await sql`DELETE FROM songs WHERE album_id = ${id}`;

    await sql`DELETE FROM albums  WHERE id = ${id}`;

    if (redisClient.isReady) {
      await redisClient.del(`album_songs_${id}`);
    }

    if (redisClient.isReady) {
      await redisClient.del("albums");
      console.log("Albums cache cleared");
    }

    if (redisClient.isReady) {
      await redisClient.del("songs");
      console.log("songs cache cleared");
    }

    res.json({ message: "Album deleted successfully" });
  }
);

export const deleteSong = asyncHandler(
  async (req: AuthenticationRequest, res: Response) => {
    if (req.user?.role !== "admin") {
      res.status(401).json({ message: "Access denied" });
      return;
    }
    const { id } = req.params;

    const isSong = await sql`
      SELECT * FROM songs WHERE id = ${id}`;

    if (isSong.length === 0) {
      res.status(404).json({ message: "Song not found" });
      return;
    }

    await sql`DELETE FROM songs WHERE id = ${id}`;

    if (redisClient.isReady) {
      await redisClient.del("songs");
      console.log("songs cache cleared");
    }

    res.json({ message: "Song deleted successfully" });
  }
);
