fetch('http://localhost:3000/films')
  .then(res => res.json())
  .then(films => {
    const movieList = document.querySelector('.column-movie-list ul');
    const coverImg = document.querySelector('.column-movie-cover img');
    const descriptionEl = document.getElementById('movie-description');
    const runtimeEl = document.getElementById('movie-runtime');
    const showtimeEl = document.getElementById('movie-showtime');
    const availableEl = document.getElementById('available-tickets');
    const quantityInput = document.getElementById('ticket-quantity');
    const totalPriceEl = document.getElementById('total-price');
    const buyButton = document.getElementById('buy-button');

    let currentFilm = null;
    const ticketPrice = 10;

    movieList.innerHTML = '';

    function displayFilmDetails(film) {
      currentFilm = film;

      coverImg.src = film.poster;
      coverImg.alt = film.title;
      descriptionEl.textContent = film.description;
      runtimeEl.textContent = `${film.runtime} min`;
      showtimeEl.textContent = film.showtime;

      const available = film.capacity - film.tickets_sold;
      availableEl.textContent = available;

      quantityInput.value = 1;
      totalPriceEl.textContent = `$${ticketPrice}`;

      if (available <= 0) {
        buyButton.textContent = 'Sold Out';
        buyButton.disabled = true;
      } else {
        buyButton.textContent = 'Buy Now';
        buyButton.disabled = false;
      }
    }

    // Films list with delete buttons & sold out styling
    films.forEach(film => {
      const li = document.createElement('li');
      li.textContent = film.title;
      li.style.cursor = 'pointer';
      li.classList.add('film-item');
      
      const available = film.capacity - film.tickets_sold;
      if (available <= 0) li.classList.add('sold-out');

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = available <= 0 ? 'Sold Out' : 'Delete';
      deleteBtn.disabled = available <= 0;
      deleteBtn.style.marginLeft = '10px';

      li.appendChild(deleteBtn);

      // Click on film title to display details
      li.addEventListener('click', e => {
        if (e.target === deleteBtn) return; 
        displayFilmDetails(film);
      });

      // Delete film from server & UI
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`Delete "${film.title}"?`)) return;

        fetch(`http://localhost:3000/films/${film.id}`, { method: 'DELETE' })
          .then(res => {
            if (!res.ok) throw new Error('Failed to delete');
            li.remove();
            // If deleted film is currently displayed, clear or show first available
            if (currentFilm && currentFilm.id === film.id) {
              if (movieList.firstChild) {
                const firstFilmId = movieList.firstChild.dataset.id || null;
                if (firstFilmId) {
                  fetch(`http://localhost:3000/films/${firstFilmId}`)
                    .then(r => r.json())
                    .then(displayFilmDetails);
                } else {
                  // Clear UI
                  currentFilm = null;
                  coverImg.src = '';
                  coverImg.alt = '';
                  descriptionEl.textContent = '';
                  runtimeEl.textContent = '';
                  showtimeEl.textContent = '';
                  availableEl.textContent = '';
                  quantityInput.value = 1;
                  totalPriceEl.textContent = '';
                  buyButton.disabled = true;
                  buyButton.textContent = 'Buy Now';
                }
              }
            }
          })
          .catch(err => alert('Error deleting film'));
      });

      li.dataset.id = film.id;
      movieList.appendChild(li);
    });

    // Show first film details on load
    if (films.length > 0) {
      displayFilmDetails(films[0]);
    }
    
    quantityInput.oninput = () => {
      const qty = parseInt(quantityInput.value) || 1;
      totalPriceEl.textContent = `$${qty * ticketPrice}`;
    };

    // Buy tickets button
    buyButton.onclick = () => {
      if (!currentFilm) return alert('No film selected');
      const qty = parseInt(quantityInput.value);
      if (!qty || qty < 1) return alert('Enter a valid number of tickets');

      const available = currentFilm.capacity - currentFilm.tickets_sold;
      if (qty > available) return alert(`Only ${available} tickets available`);

      const updatedTicketsSold = currentFilm.tickets_sold + qty;

      // PATCH update tickets_sold on film
      fetch(`http://localhost:3000/films/${currentFilm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets_sold: updatedTicketsSold })
      })
      .then(res => res.json())
      .then(updatedFilm => {
        currentFilm = updatedFilm;
        displayFilmDetails(updatedFilm);

        // POST new ticket purchase
        return fetch('http://localhost:3000/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ film_id: currentFilm.id, number_of_tickets: qty })
        });
      })
      .then(res => res.json())
      .then(() => {
        alert(`Successfully bought ${qty} ticket(s)`);
        // Refresh film list to update sold out state & delete buttons
        return fetch('http://localhost:3000/films');
      })
      .then(res => res.json())
      .then(updatedFilms => {
        movieList.innerHTML = '';
        updatedFilms.forEach(film => {
          const li = document.createElement('li');
          li.textContent = film.title;
          li.style.cursor = 'pointer';
          li.classList.add('film-item');

          const available = film.capacity - film.tickets_sold;
          if (available <= 0) li.classList.add('sold-out');

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = available <= 0 ? 'Sold Out' : 'Delete';
          deleteBtn.disabled = available <= 0;
          deleteBtn.style.marginLeft = '10px';

          li.appendChild(deleteBtn);

          li.addEventListener('click', e => {
            if (e.target === deleteBtn) return;
            displayFilmDetails(film);
          });

          deleteBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!confirm(`Delete "${film.title}"?`)) return;

            fetch(`http://localhost:3000/films/${film.id}`, { method: 'DELETE' })
              .then(res => {
                if (!res.ok) throw new Error('Failed to delete');
                li.remove();
                if (currentFilm && currentFilm.id === film.id) {
                  displayFilmDetails(updatedFilms[0] || null);
                }
              })
              .catch(() => alert('Error deleting film'));
          });

          li.dataset.id = film.id;
          movieList.appendChild(li);
        });
      });
    };
  })
  .catch(error => console.error('Error fetching films:', error));

