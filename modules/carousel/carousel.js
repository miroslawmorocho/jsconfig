(function () {
    const wrapper = document.querySelector('.carousel-wrapper1');
    const track = document.querySelector('.carousel-track1');
    const nextBtn = document.querySelector('.carousel-btn.next');
    const prevBtn = document.querySelector('.carousel-btn.prev');

    let items = Array.from(track.children);

    /* DUPLICAR PARA FAKE INFINITO */
    items.forEach(item => track.appendChild(item.cloneNode(true)));
    items = Array.from(track.children);

    const gap = 20;
    const itemWidth = items[0].offsetWidth + gap;
    let index = 0;

    function moveCarousel() {
        track.style.transform = `translateX(-${index * itemWidth}px)`;
    }

    function goNext() {
        index++;
        moveCarousel();

        if (index >= items.length / 2) {
            setTimeout(() => {
                track.style.transition = 'none';
                index = 0;
                moveCarousel();
                track.offsetHeight;
                track.style.transition = 'transform 0.6s ease';
            }, 600);
        }
    }

    function goPrev() {
        if (index <= 0) {
            track.style.transition = 'none';
            index = items.length / 2;
            moveCarousel();
            track.offsetHeight;
            track.style.transition = 'transform 0.6s ease';
        }
        index--;
        moveCarousel();
    }

    /* ⏱️ AUTOPLAY CON RESET */
    const AUTOPLAY_TIME = 20000;
    let autoplayTimer = null;

    function startAutoplay() {
        clearTimeout(autoplayTimer);
        autoplayTimer = setTimeout(() => {
            goNext();
            startAutoplay();
        }, AUTOPLAY_TIME);
    }

    /* BOTONES */
    nextBtn.addEventListener('click', () => {
        goNext();
        startAutoplay();
    });

    prevBtn.addEventListener('click', () => {
        goPrev();
        startAutoplay();
    });

    /* SWIPE MÓVIL */
    let startX = 0;

    track.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
    });

    track.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 50) {
            diff < 0 ? goNext() : goPrev();
            startAutoplay();
        }
    });

    /* 👀 ANIMACIÓN SOLO AL ENTRAR EN PANTALLA (1 VEZ) */
    let hasAnimatedOnce = false;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimatedOnce) {
                hasAnimatedOnce = true;
                goNext();        // 🔥 giro de atención
                startAutoplay();
                observer.disconnect();
            }
        });
    }, {
        threshold: 0.5   // 50% visible
    });

    observer.observe(wrapper);

})();
