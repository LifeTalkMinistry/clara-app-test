export const getStableListKey = (item, index) => {
  return (
    item?.id ||
    item?.local_id ||
    item?.uuid ||
    item?.created_at ||
    item?.updated_at ||
    `${index}`
  );
};

export const limitList = (items = [], limit = 10) => {
  const safe = Array.isArray(items) ? items : [];
  return safe.slice(0, Math.max(Number(limit) || 0, 0));
};

export const mapWithStableKeys = (items = [], renderFn) => {
  const safe = Array.isArray(items) ? items : [];

  return safe.map((item, index) => {
    const key = getStableListKey(item, index);
    return renderFn(item, index, key);
  });
};
