import { Elysia } from "elysia";
import { auth } from "./service";
import { AuthModel } from "./model";

export const authRoutes = new Elysia({ name: "better-auth" })
    .mount(auth.handler)
    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({
                    headers,
                });

                if (!session) {
                    return status(401, { message: AuthModel.messages.unauthorized });
                }

                return {
                    user: session.user,
                    session: session.session,
                };
            },
        },
    });
