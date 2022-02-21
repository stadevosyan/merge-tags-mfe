//@ts-nocheck

/**
 * Cross-browser support for caretPositionFromPoint.
 * This returns a `CaretPosition` like object instead
 * of a CaretPosition, since we can't create it for
 * browsers that don't support this API.
 */
 export function caretPositionFromPoint(x: number, y: number): {
  offsetNode: Node;
  offset: number;
  getClientRect(): ClientRect | DOMRect;
} | null {
  // @ts-ignore
  if (document.caretPositionFromPoint) {
    // @ts-ignore
    let position = document.caretPositionFromPoint(x, y);
    return position ? {
      offsetNode: position.offsetNode,
      offset: position.offset,
      getClientRect() {
        return position.getClientRect();
      }
    } : null;
  } else {
    let range = document.caretRangeFromPoint(x, y);
    return range ? {
      offsetNode: range.startContainer,
      offset: range.startOffset,
      getClientRect() {
        return range.getClientRects()[0];
      }
    } : null;
  }
}

function getShadowRoots(node: Node, roots: ShadowRoot[] = []) {
  let iter: Node | Element | ShadowRoot | null = node;
  while (iter.parentNode || iter.host) {
    if (iter instanceof ShadowRoot) {
      roots.push(iter);
      iter = iter.host!;
      continue;
    }
    iter = iter.parentNode!;
  }
  return roots;
}

/**
 * Cross-browser support for caret range from point.
 * This is deprecated, but will be supported with a backfill
 * from `caretPositionFromPoint`.
 *
 * @deprecated
 */
export function caretRangeFromPoint(x: number, y: number) {
  if (document.caretPositionFromPoint) {
    let position = document.caretPositionFromPoint(x, y);
    if (position) {
      let range = document.createRange();
      let offsetNode = position.offsetNode;
      let shadowRoots = getShadowRoots(offsetNode);
      if (shadowRoots.length) {
        offsetNode = shadowRoots[shadowRoots.length - 1].host!;
      }
      console.log(offsetNode);
      debugger;
      range.setStart(offsetNode, position.offset);
      range.setEnd(offsetNode, position.offset);
      return range;
    }
    return null;
  } else {
    return document.caretRangeFromPoint(x, y);
  }
}