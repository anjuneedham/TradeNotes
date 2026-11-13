import { cache } from "react";
import { headers } from "next/headers";
import { getAuth } from "./auth";

/** The signed-in session, looked up once per request (the app layout and getContext() both need it). */
export const currentSession = cache(async () => getAuth().api.getSession({ headers: await headers() }));
