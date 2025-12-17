/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useRef, useEffect, useContext } from 'react';
import { CSSTransition as ReactCSSTransition } from 'react-transition-group';
import type { EndHandler } from 'react-transition-group/Transition';
import { JSX } from 'react/jsx-runtime';

// Supported HTML tags
type SupportedTags = 'div' | 'ul' | 'span';

// Map tags to HTML element types
type ElementTypeMap = {
  div: HTMLDivElement;
  ul: HTMLUListElement;
  span: HTMLSpanElement;
};

interface TransitionContextType {
  parent: {
    show: boolean;
    isInitialRender?: boolean;
    appear?: boolean;
  };
}

const TransitionContext = React.createContext<TransitionContextType>({ parent: { show: false } });

function useIsInitialRender(): boolean {
  const isInitialRender = useRef(true);
  useEffect(() => {
    isInitialRender.current = false;
  }, []);
  return isInitialRender.current;
}

interface CSSTransitionProps<T extends SupportedTags> {
  show: boolean;
  enter?: string;
  enterStart?: string;
  enterEnd?: string;
  leave?: string;
  leaveStart?: string;
  leaveEnd?: string;
  appear?: boolean;
  unmountOnExit?: boolean;
  tag?: T;
  children: React.ReactNode;
  className?: string;
  id?: string;
  role?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-modal'?: boolean | 'true' | 'false';
  style?: React.CSSProperties;
}

const CSSTransition = <T extends SupportedTags = 'div'>({
  show,
  enter = '',
  enterStart = '',
  enterEnd = '',
  leave = '',
  leaveStart = '',
  leaveEnd = '',
  appear,
  unmountOnExit = false,
  tag = 'div' as T,
  children,
  className,
  id,
  role,
  'aria-hidden': ariaHidden,
  'aria-modal': ariaModal,
  style = {},
}: CSSTransitionProps<T>): JSX.Element => {
  const enterClasses = enter.split(' ').filter(Boolean);
  const enterStartClasses = enterStart.split(' ').filter(Boolean);
  const enterEndClasses = enterEnd.split(' ').filter(Boolean);
  const leaveClasses = leave.split(' ').filter(Boolean);
  const leaveStartClasses = leaveStart.split(' ').filter(Boolean);
  const leaveEndClasses = leaveEnd.split(' ').filter(Boolean);
  const removeFromDom = unmountOnExit;

  const nodeRef = useRef<ElementTypeMap[T]>(null);
  const Component = tag as keyof HTMLElementTagNameMap;

  const addClasses = (node: HTMLElement, classes: string[]) => {
    if (classes.length) node.classList.add(...classes);
  };

  const removeClasses = (node: HTMLElement, classes: string[]) => {
    if (classes.length) node.classList.remove(...classes);
  };

  return (
    <ReactCSSTransition
      appear={appear}
      nodeRef={nodeRef}
      unmountOnExit={removeFromDom}
      in={show}
      timeout={300}
      onEnter={() => {
        if (nodeRef.current) {
          if (!removeFromDom) nodeRef.current.style.display = '';
          addClasses(nodeRef.current, [...enterClasses, ...enterStartClasses]);
        }
      }}
      onEntering={() => {
        if (nodeRef.current) {
          removeClasses(nodeRef.current, enterStartClasses);
          addClasses(nodeRef.current, enterEndClasses);
        }
      }}
      onEntered={() => {
        if (nodeRef.current) {
          removeClasses(nodeRef.current, [...enterEndClasses, ...enterClasses]);
        }
      }}
      onExit={() => {
        if (nodeRef.current) {
          addClasses(nodeRef.current, [...leaveClasses, ...leaveStartClasses]);
        }
      }}
      onExiting={() => {
        if (nodeRef.current) {
          removeClasses(nodeRef.current, leaveStartClasses);
          addClasses(nodeRef.current, leaveEndClasses);
        }
      }}
      onExited={() => {
        if (nodeRef.current) {
          removeClasses(nodeRef.current, [...leaveEndClasses, ...leaveClasses]);
          if (!removeFromDom) nodeRef.current.style.display = 'none';
        }
      }}
    >
      {React.createElement(
        Component,
        {
          ref: nodeRef,
          className,
          id,
          role,
          'aria-hidden': ariaHidden,
          'aria-modal': ariaModal,
          style: { ...style, display: removeFromDom ? '' : 'none' },
        },
        children
      )}
    </ReactCSSTransition>
  );
};

interface TransitionProps<T extends SupportedTags> {
  show?: boolean;
  appear?: boolean;
  enter?: string;
  enterStart?: string;
  enterEnd?: string;
  leave?: string;
  leaveStart?: string;
  leaveEnd?: string;
  tag?: T;
  children: React.ReactNode;
  className?: string;
  id?: string;
  role?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-modal'?: boolean | 'true' | 'false';
  style?: React.CSSProperties;
}

const Transition = <T extends SupportedTags = 'div'>({
  show,
  appear,
  ...rest
}: TransitionProps<T>): JSX.Element => {
  const { parent } = useContext(TransitionContext);
  const isInitialRender = useIsInitialRender();
  const isChild = show === undefined;

  if (isChild) {
    return (
      <CSSTransition
        appear={parent.appear || !parent.isInitialRender}
        show={parent.show}
        {...rest}
      />
    );
  }

  return (
    <TransitionContext.Provider
      value={{
        parent: {
          show: show ?? false,
          isInitialRender,
          appear,
        },
      }}
    >
      <CSSTransition appear={appear} show={show ?? false} {...rest} />
    </TransitionContext.Provider>
  );
};

export default Transition;
