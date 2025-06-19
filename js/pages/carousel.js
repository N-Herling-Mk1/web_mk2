document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.querySelector(".carousel");
  const originalTiles = Array.from(document.querySelectorAll(".page-link"));
  const leftBtn = document.querySelector(".carousel-toggle.left");
  const rightBtn = document.querySelector(".carousel-toggle.right");

  const total = originalTiles.length;
  if (total < 3) {
    console.warn("Carousel requires at least 3 tiles");
    return;
  }

  const tileStyle = getComputedStyle(originalTiles[0]);
  const tileWidth = originalTiles[0].offsetWidth +
                    parseInt(tileStyle.marginLeft) +
                    parseInt(tileStyle.marginRight);

  let centerIndex = 0;
  const windowSize = 5;
  const windowTiles = [];

  carousel.innerHTML = "";
  for (let i = 0; i < windowSize; i++) {
    const tile = document.createElement("div");
    tile.classList.add("page-link");
    tile.style.width = tileStyle.width;
    tile.style.marginLeft = tileStyle.marginLeft;
    tile.style.marginRight = tileStyle.marginRight;
    carousel.appendChild(tile);
    windowTiles.push(tile);
  }

  function updateWindowTiles() {
    for (let i = 0; i < windowSize; i++) {
      const idx = (centerIndex - 2 + i + total) % total;
      const tile = windowTiles[i];
      const original = originalTiles[idx];

      tile.dataset.large = original.dataset.large;
      tile.dataset.small = original.dataset.small;

      tile.innerHTML = `
        <div class="large-label">${original.dataset.large || ""}</div>
        <div class="small-label">${original.dataset.small || ""}</div>
      `;

      tile.onclick = () => {
        console.log(`Clicked tile: large="${tile.dataset.large}", small="${tile.dataset.small}"`);
      };

      tile.onmouseenter = () => {
        console.log(`Hover start on tile: index=${idx}`);
      };

      tile.onmouseleave = () => {
        console.log(`Hover end on tile: index=${idx}`);
      };

      // Remove both 'center' and any transitional classes
      tile.classList.remove("center", "fade-out");
    }
  }

  function setCarouselPosition(positionX, animate = true) {
    carousel.style.transition = animate ? "transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)" : "none";

    carousel.style.transform = `translate3d(${positionX}px, 0, 0)`;
  }

  setCarouselPosition(0, false);
  updateWindowTiles();
  updateWindowTiles();
  windowTiles[1].classList.add("center"); // make the third tile pulse on load


  let isAnimating = false;

  function scroll(direction) {
    if (isAnimating) return;
    isAnimating = true;

    // Step 1: fade out haze
    windowTiles.forEach(tile => tile.classList.add("fade-out"));

    setTimeout(() => {
      // Step 2: update content and prep for slide
      centerIndex = (centerIndex + (direction === "right" ? 1 : -1) + total) % total;
      updateWindowTiles();
      setCarouselPosition(direction === "right" ? tileWidth : -tileWidth, false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCarouselPosition(0, true);
        });
      });

      carousel.addEventListener("transitionend", function handler(e) {
        if (e.propertyName !== "transform") return;
        carousel.removeEventListener("transitionend", handler);
        setCarouselPosition(0, false);

        // Step 3: apply 'center' class back with slight delay
        setTimeout(() => {
          const centerTile = windowTiles[1]; // center tile is always index 2
          centerTile.classList.remove("fade-out");
          centerTile.classList.add("center");
        }, 50);

        isAnimating = false;
      });
    }, 500); // wait for green haze fade out
  }

  leftBtn.addEventListener("click", () => scroll("left"));
  rightBtn.addEventListener("click", () => scroll("right"));
});
