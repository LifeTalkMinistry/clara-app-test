export const shallowEqualObjects = (prev = {}, next = {}) => {
  if (Object.is(prev, next)) return true;

  const prevKeys = Object.keys(prev || {});
  const nextKeys = Object.keys(next || {});

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!Object.is(prev[key], next[key])) return false;
  }

  return true;
};

export const compareDashboardSectionProps = (prevProps = {}, nextProps = {}) => {
  if (prevProps.children !== nextProps.children) return false;
  if (prevProps.className !== nextProps.className) return false;

  const { children: _prevChildren, className: _prevClassName, ...prevRest } = prevProps;
  const { children: _nextChildren, className: _nextClassName, ...nextRest } = nextProps;

  return shallowEqualObjects(prevRest, nextRest);
};

export const getArrayRenderKey = (items = []) => {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) return "0";

  const last = safeItems[safeItems.length - 1];
  const first = safeItems[0];
  const firstKey = first?.id || first?.local_id || first?.updated_at || first?.created_at || "first";
  const lastKey = last?.id || last?.local_id || last?.updated_at || last?.created_at || "last";

  return `${safeItems.length}:${firstKey}:${lastKey}`;
};
