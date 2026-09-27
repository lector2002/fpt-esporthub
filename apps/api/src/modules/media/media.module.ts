import { Module } from "@nestjs/common";
import { AdminMediaController, MediaController } from "./media.controller";
import { MediaStorage } from "./media-storage";
import { MediaService } from "./media.service";

/** Uploaded pictures: avatars, team logos and achievement cards. */
@Module({
  controllers: [MediaController, AdminMediaController],
  providers: [MediaStorage, MediaService],
  exports: [MediaStorage],
})
export class MediaModule {}
