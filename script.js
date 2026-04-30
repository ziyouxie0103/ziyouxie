if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("load", () => {
  const navigationEntry = performance.getEntriesByType("navigation")[0];
  const isReload = navigationEntry?.type === "reload";

  if (isReload && window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }

  if (!window.location.hash || isReload) {
    window.scrollTo(0, 0);
  }
});

const year = document.querySelector("#year");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const sectionLinks = navLinks.filter((link) =>
  link.getAttribute("href")?.startsWith("#")
);
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const revealItems = document.querySelectorAll(".reveal");
const rotatingImages = document.querySelectorAll("[data-rotation-sources]");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const getHeaderOffset = () => {
  const header = document.querySelector(".site-header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  return headerHeight + 24;
};

const setActiveLink = (sectionId) => {
  if (!sectionId) {
    return;
  }

  const href = `#${sectionId}`;
  const link = sectionLinks.find((item) => item.getAttribute("href") === href);

  if (!link) {
    return;
  }

  navLinks.forEach((item) => item.classList.toggle("is-active", item === link));
};

const updateActiveNav = () => {
  if (!sections.length) {
    return;
  }

  const offset = getHeaderOffset();
  const scrollAnchor = offset;
  let activeSection = sections[0];

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top - scrollAnchor <= 0) {
      activeSection = section;
    }
  });

  setActiveLink(activeSection.id);
};

let scheduledNavUpdate = false;
const scheduleNavUpdate = () => {
  if (scheduledNavUpdate) {
    return;
  }

  scheduledNavUpdate = true;
  window.requestAnimationFrame(() => {
    scheduledNavUpdate = false;
    updateActiveNav();
  });
};

window.addEventListener("scroll", scheduleNavUpdate, { passive: true });
window.addEventListener("resize", scheduleNavUpdate);
window.addEventListener("hashchange", scheduleNavUpdate);
window.addEventListener("load", () => {
  scheduleNavUpdate();
  window.setTimeout(scheduleNavUpdate, 250);
});

const navObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        () => {
          scheduleNavUpdate();
        },
        {
          rootMargin: `-${getHeaderOffset()}px 0px -60% 0px`,
          threshold: [0, 0.1, 0.2, 0.35, 0.5]
        }
      )
    : null;

if (navObserver) {
  sections.forEach((section) => navObserver.observe(section));
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

rotatingImages.forEach((image) => {
  const sources = image.dataset.rotationSources
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const alts = image.dataset.rotationAlts
    ?.split("|")
    .map((item) => item.trim());

  if (!sources || sources.length < 2) {
    return;
  }

  const figure = image.closest(".hero-photo");
  const shouldShowDots = image.dataset.sliderDots === "true";
  let currentIndex = 0;
  let intervalId;
  let dots = [];
  let touchStartX = 0;
  let touchDeltaX = 0;
  const loadedSources = new Set([image.currentSrc || image.src]);

  const preloadSource = (source) =>
    new Promise((resolve) => {
      if (loadedSources.has(source)) {
        resolve();
        return;
      }

      const preloader = new Image();
      preloader.onload = () => {
        loadedSources.add(source);
        resolve();
      };
      preloader.onerror = () => resolve();
      preloader.src = source;
    });

  sources.forEach((source, index) => {
    if (index !== currentIndex) {
      preloadSource(source);
    }
  });

  const syncDots = () => {
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
      dot.setAttribute("aria-pressed", String(index === currentIndex));
    });
  };

  const applyImage = (nextIndex) => {
    currentIndex = nextIndex;
    image.src = sources[currentIndex];

    if (alts?.[currentIndex]) {
      image.alt = alts[currentIndex];
    }

    syncDots();
  };

  const transitionTo = async (nextIndex) => {
    if (nextIndex === currentIndex) {
      return;
    }

    await preloadSource(sources[nextIndex]);

    if (prefersReducedMotion.matches) {
      applyImage(nextIndex);
      return;
    }

    image.classList.add("is-sliding-out");

    window.setTimeout(() => {
      applyImage(nextIndex);
      image.classList.remove("is-sliding-out");
      image.classList.add("is-sliding-in");

      window.requestAnimationFrame(() => {
        image.classList.remove("is-sliding-in");
      });
    }, 180);
  };

  const startRotation = () => {
    if (prefersReducedMotion.matches) {
      return;
    }

    intervalId = window.setInterval(() => {
      transitionTo((currentIndex + 1) % sources.length);
    }, 2000);
  };

  const resetRotation = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
    }

    startRotation();
  };

  const moveToRelative = (direction) => {
    const nextIndex =
      (currentIndex + direction + sources.length) % sources.length;
    transitionTo(nextIndex);
    resetRotation();
  };

  if (figure && shouldShowDots) {
    const dotWrapper = document.createElement("div");
    dotWrapper.className = "hero-slider-dots";
    dotWrapper.setAttribute("aria-label", "Traveler photo navigation");

    dots = sources.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero-slider-dot";
      dot.setAttribute("aria-label", `Show traveler photo ${index + 1}`);
      dot.setAttribute("aria-pressed", "false");
      dot.addEventListener("click", () => {
        transitionTo(index);
        resetRotation();
      });
      dotWrapper.appendChild(dot);
      return dot;
    });

    const caption = figure.querySelector("figcaption");

    if (caption) {
      caption.insertAdjacentElement("beforebegin", dotWrapper);
    } else {
      figure.appendChild(dotWrapper);
    }

    figure.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? 0;
        touchDeltaX = 0;
      },
      { passive: true }
    );

    figure.addEventListener(
      "touchmove",
      (event) => {
        const currentTouchX = event.changedTouches[0]?.clientX ?? touchStartX;
        touchDeltaX = currentTouchX - touchStartX;
      },
      { passive: true }
    );

    figure.addEventListener(
      "touchend",
      () => {
        if (Math.abs(touchDeltaX) < 35) {
          return;
        }

        moveToRelative(touchDeltaX < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  syncDots();
  startRotation();
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.18
  }
);

revealItems.forEach((item) => revealObserver.observe(item));
