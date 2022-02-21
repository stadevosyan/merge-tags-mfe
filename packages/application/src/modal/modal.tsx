// @ts-nocheck

import React from "react";
import ReactDOM from "react-dom";

export class Modal extends React.Component {
  constructor(props) {
    super(props);
    const node = document.createElement("div");
    node.id = 'modal-build-margetag'
    node.style.position = "absolute";
    node.style.top = '300px';
    node.style.left = '400px';
    node.style.zIndex = 1000;
    
    document.body.appendChild(node);

    this.el = document.createElement('div');
  }

  componentDidMount() {
    // The portal element is inserted in the DOM tree after
    // the Modal's children are mounted, meaning that children
    // will be mounted on a detached DOM node. If a child
    // component requires to be attached to the DOM tree
    // immediately when mounted, for example to measure a
    // DOM node, or uses 'autoFocus' in a descendant, add
    // state to Modal and only render the children when Modal
    // is inserted in the DOM tree.
    document.getElementById('modal-build-margetag').appendChild(this.el);
  }

  componentWillUnmount() {
    document.getElementById('modal-build-margetag').removeChild(this.el);
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.el
    );
  }
}


function Child() {
  // The click event on this button will bubble up to parent,
  // because there is no 'onClick' attribute defined
  return (
    <div className="modal">
      <button>Click</button>
    </div>
  );
}
