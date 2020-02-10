import {getSectionGivenCurrentState} from './selection';

import Section from './Section';

export interface ObserverOptions {
  rootElement?: HTMLElement;
  rootMargin: string;
  getElementToSpyFromLinkTarget: getElementToSpyFromLinkTargetFn;
  navigationLinksSelector: string;
  className?: string;
}

type getElementToSpyFromLinkTargetFn = (e: Element) => Element;

class Observer {
  private observer: IntersectionObserver;
  readonly rootElement: HTMLElement;
  readonly rootMargin: string;
  readonly sections: Section[] = [];
  readonly className: string;
  readonly listenerRemovalFunctions: Array<() => void> = [];

  // @TODO replace this with something that snapshots the scroll position and
  // doesn't get reset until the scroll position changes?
  //
  // Use this mechanism to not activate the scroll spy until the scroll position
  // has changed at all (don't highlight anything on page load unless the hash
  // matches!)
  private ignoreNextIntersectionObserverCallback = false;

  constructor({
    className = 'active',
    getElementToSpyFromLinkTarget,
    navigationLinksSelector,
    rootElement = document.documentElement,
    rootMargin = '-50px 0',
  }: ObserverOptions) {
    this.rootElement = rootElement;
    this.rootMargin = rootMargin;
    this.className = className;
    this.observer = new IntersectionObserver(
      this.onIntersectionChange.bind(this),
      {
        rootMargin: this.rootMargin,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      },
    );

    this.setupSections(getElementToSpyFromLinkTarget, navigationLinksSelector);
    this.observeHashChange();
    this.observeSectionIntersection();

    if (globalThis.location.hash) {
      this.onHashChange();
    }
  }

  destroy() {
    this.listenerRemovalFunctions.forEach(fn => fn());
    this.listenerRemovalFunctions.length = 0;

    this.removeAllSelections();
    this.sections.length = 0;
  }

  getAnchorsFromHash(hash: string): HTMLAnchorElement[] {
    return Array.from(this.rootElement.querySelectorAll(`a[href="${hash}"]`));
  }

  setupSections(
    getElementToSpyFromLinkTarget: getElementToSpyFromLinkTargetFn,
    navigationLinksSelector: string,
  ) {
    const navLinks: HTMLAnchorElement[] = Array.from(
      this.rootElement.querySelectorAll(navigationLinksSelector),
    );
    navLinks.forEach(navLink => {
      if (!navLink) {
        console.warn(`Heading did not have a sibling element.`);
        return;
      }
      const hash = navLink.hash;
      const heading: Element | null = this.rootElement.querySelector(hash);
      if (!heading) {
        console.warn(
          `Anchor hash '${hash}' doesn't reference a valid DOM node, cannot continue`,
        );
        return;
      }
      const target = getElementToSpyFromLinkTarget(heading);
      if (!target) {
        console.warn(`Heading did not have a sibling element.`);
        return;
      }
      this.sections.push({
        hash,
        heading,
        intersectionRatio: 0,
        intersectionRectArea: 0,
        isSelected: false,
        lastIntersectionObservationTime: 0,
        lastIntersectionRatio: 0,
        navLink,
        target,
      });
    });
  }

  // tslint:disable-next-line:no-any
  filterElements(arr: any[]): Element[] {
    return arr.filter(v => v instanceof Element);
  }

  removeAllSelections() {
    this.sections
      .filter(section => section.isSelected)
      .forEach(section => {
        this.filterElements(Object.values(section)).forEach(element =>
          element.classList.remove(this.className),
        );
        section.isSelected = false;
      });
  }

  observeHashChange() {
    globalThis.addEventListener('hashchange', this.onHashChange.bind(this));

    this.listenerRemovalFunctions.push(() => {
      globalThis.removeEventListener(
        'hashchange',
        this.onHashChange.bind(this),
      );
    });
  }

  selectSection(section: Section) {
    this.filterElements(Object.values(section)).forEach(element =>
      element.classList.add(this.className),
    );
    section.isSelected = true;
  }

  onHashChange() {
    this.ignoreNextIntersectionObserverCallback = true;

    this.removeAllSelections();

    const anchors = this.getAnchorsFromHash(globalThis.location.hash);
    anchors.forEach(anchor => {
      const sectionsToSelect = this.sections.filter(
        section => section.navLink === anchor,
      );
      sectionsToSelect.forEach(this.selectSection.bind(this));
    });
  }

  observeSectionIntersection() {
    this.sections.forEach(({target}) => this.observer.observe(target));

    this.listenerRemovalFunctions.push(() => {
      this.sections.forEach(({target}) => this.observer.disconnect());
    });
  }

  onIntersectionChange(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      this.sections
        .filter(s => s.target === entry.target)
        .forEach(s => {
          // @TODO Move this data to an internal weakmap?
          s.lastIntersectionObservationTime = entry.time;
          s.lastIntersectionRatio = s.intersectionRatio;
          s.intersectionRatio = entry.intersectionRatio;
          s.intersectionRectArea = this.getVisibleRectArea(entry);
        });
    });

    if (this.ignoreNextIntersectionObserverCallback) {
      this.ignoreNextIntersectionObserverCallback = false;
    } else {
      // console.table(entries);
      const newlySelectedSection = this.getSectionToSelect();
      if (newlySelectedSection != null) {
        this.removeAllSelections();
        this.selectSection(newlySelectedSection);
      }
    }
  }

  getVisibleRectArea(entry: IntersectionObserverEntry) {
    const {top, left, right, bottom} = entry.intersectionRect;
    return (right - left) * (bottom - top);
  }

  getSectionToSelect(): Section | null {
    const sectionToSelect = getSectionGivenCurrentState({
      getSectionToMostRecentlyBecome100PctVisible: () =>
        this.sections
          .filter(s => s.intersectionRatio === 1)
          .reduce((toReturn, next) => {
            return next.lastIntersectionObservationTime >
              toReturn.lastIntersectionObservationTime
              ? next
              : toReturn;
          }),
      getSectionsWithLargestVisibleTargetRect: () =>
        this.sections.reduce((mostVisible, next) => {
          return next.intersectionRectArea > mostVisible.intersectionRectArea
            ? next
            : mostVisible;
        }),
      isAnything100PctVisible: () =>
        this.sections.some(s => s.intersectionRatio === 1),
      isAnythingSelectedYet: () => this.sections.some(s => s.isSelected),
    });

    return sectionToSelect.isSelected ? null : sectionToSelect;
  }
}

export default Observer;
