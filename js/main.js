const desktopQuery = window.matchMedia("(min-width: 769px)");
let desktopCleanup = null;

function syncSliderMode() {
  if (desktopQuery.matches && !desktopCleanup) desktopCleanup = initSlider();
  else if (!desktopQuery.matches && desktopCleanup) {
    desktopCleanup();
    desktopCleanup = null;
  }
}

desktopQuery.addEventListener("change", syncSliderMode);
syncSliderMode();

function initSlider() {
  const slides = gsap.utils.toArray(".screen");
  const SLIDE_COUNT = slides.length;
  const ANGLE_STEP = 20;
  const BASE_RING_SIZE = 706;
  const BASE_RING_RADIUS = 347;

  let current = 0;
  let animating = false;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  gsap.set(slides[1], { xPercent: 100 });
  gsap.set(slides[2], { yPercent: 100 });

  const wheelItems = gsap.utils.toArray(".slide-wheel__item");
  const iconAngles = [0, -ANGLE_STEP, ANGLE_STEP];

  // утилита: угол в градусах → {x, y}
  function posFromAngle(deg) {
    const ring = document.querySelector(".slide-wheel__ring");
    const scale = ring ? ring.getBoundingClientRect().width / BASE_RING_SIZE : 1;
    const radius = BASE_RING_RADIUS * scale;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  }

  wheelItems.forEach((item, i) => {
    gsap.set(item, posFromAngle(iconAngles[i]));
  });

  const TRANSITIONS = [
    {
      // от 0 к 1: горизонтально
      forward: { exit: { xPercent: -100 }, enter: { xPercent: 100 } },
      backward: { exit: { xPercent: 100 }, enter: { xPercent: -100 } },
    },
    {
      // от 1 к 2: вертикально
      forward: { exit: { yPercent: -100 }, enter: { yPercent: 100 } },
      backward: { exit: { yPercent: 100 }, enter: { yPercent: -100 } },
    },
  ];

  function goTo(index) {
    if (animating || index === current || index < 0 || index >= SLIDE_COUNT)
      return;
    animating = true;

    const dir = index > current ? "forward" : "backward";
    const config = TRANSITIONS[Math.min(current, index)][dir];
    const fromSlide = slides[current];
    const toSlide = slides[index];

    // сброс осей x y при пролистывании слайда
    gsap.set(toSlide, { xPercent: 0, yPercent: 0, ...config.enter });

    gsap
      .timeline({
        onComplete: () => {
          current = index;
          animating = false;
        },
      })
      .to(fromSlide, { ...config.exit, duration: 0.8, ease: "power2.inOut" })
      .to(
        toSlide,
        { xPercent: 0, yPercent: 0, duration: 0.8, ease: "power2.inOut" },
        "<",
      );

    updateWheel(index);
  }

  const onWheel = (e) => {
      e.preventDefault();
      if (animating) return;
      if (e.deltaY > 0) goTo(current + 1);
      else if (e.deltaY < 0) goTo(current - 1);
    };
  window.addEventListener("wheel", onWheel, { passive: false });

  const onKeydown = (e) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") goTo(current + 1);
    if (e.key === "ArrowUp" || e.key === "PageUp") goTo(current - 1);
  };
  window.addEventListener("keydown", onKeydown);

  function updateWheel(index) {
    const forward = index > current;
    const dur = 0.6;
    const OFF = 55;

    const newAngles = [0, 0, 0];
    newAngles[index] = 0;
    newAngles[(index + 1) % 3] = -ANGLE_STEP;
    newAngles[(index + 2) % 3] = ANGLE_STEP;

    wheelItems.forEach((item, i) => {
      const from = iconAngles[i];
      const to = newAngles[i];
      if (from === to) return;

      if (from !== 0 && to !== 0) {
        const exitAngle = forward ? OFF : -OFF;
        const entryAngle = forward ? -OFF : OFF;
        gsap
          .timeline()
          .to(item, {
            ...posFromAngle(exitAngle),
            duration: dur / 2,
            ease: "power2.in",
          })
          .set(item, posFromAngle(entryAngle))
          .to(item, {
            ...posFromAngle(to),
            duration: dur / 2,
            ease: "power2.out",
          });
      } else {
        gsap.to(item, {
          ...posFromAngle(to),
          duration: dur,
          ease: "power2.inOut",
        });
      }

      iconAngles[i] = to;
    });

    document.querySelectorAll(".slide-wheel__btn").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === index);
    });
  }

  document.querySelectorAll(".slide-wheel__btn").forEach((btn) => {
    btn._slideWheelClick = () => {
      goTo(parseInt(btn.closest("[data-slide]").dataset.slide));
    };
    btn.addEventListener("click", btn._slideWheelClick);
  });

  return () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeydown);
    document.querySelectorAll(".slide-wheel__btn").forEach((btn) => {
      if (btn._slideWheelClick) btn.removeEventListener("click", btn._slideWheelClick);
      delete btn._slideWheelClick;
      btn.classList.remove("is-active");
    });
    gsap.killTweensOf([...slides, ...wheelItems]);
    gsap.set(slides, { clearProps: "transform" });
    gsap.set(wheelItems, { clearProps: "transform" });
    document.body.style.overflow = previousOverflow;
  };
}
