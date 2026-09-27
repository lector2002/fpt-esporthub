import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Attaches `req.user` when a valid bearer token is sent; never rejects the request. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser>(_error: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
