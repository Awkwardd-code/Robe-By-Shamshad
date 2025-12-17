declare module "react-transition-group" {
  export { default as CSSTransition } from "react-transition-group/esm/CSSTransition";
  export { default as ReplaceTransition } from "react-transition-group/esm/ReplaceTransition";
  export { default as SwitchTransition } from "react-transition-group/esm/SwitchTransition";
  export { default as TransitionGroup } from "react-transition-group/esm/TransitionGroup";
  export { default as Transition } from "react-transition-group/esm/Transition";
  export { default as config } from "react-transition-group/esm/config";
}

declare module "react-transition-group/Transition" {
  import { default as Transition } from "react-transition-group/esm/Transition";
  export * from "react-transition-group/esm/Transition";
  export default Transition;
  export type EndHandler = (node: Element) => void;
}
