alter table tradenotes.profiles
  add column if not exists trading_style text check (trading_style in ('scalping','day','swing','position')),
  add column if not exists preferred_timeframe text,
  add column if not exists main_goal text check (main_goal in ('consistency','risk','strategy','psychology','track')),
  add column if not exists primary_market text;
