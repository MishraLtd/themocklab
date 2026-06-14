require("dotenv").config();

const { createClient } =
    require("@supabase/supabase-js");

const WebSocket = require("ws");

global.WebSocket = WebSocket;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = supabase;