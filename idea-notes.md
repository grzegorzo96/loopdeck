## Loopdeck - MVP

### Główny problem
Osoba pracująca umysłowo (student, freelancer, knowledge worker) trzyma zadania w notatkach, czatach i głowie. Lista rośnie szybciej niż jest realizowana, więc rano nie wie, co zrobić jako pierwsze. Koszt: czas na wybór, poczucie przeciążenia, odkładanie wszystkiego.

Problemem nie jest brak listy, tylko brak limitu na „dziś”. Aplikacja nie konkuruje z pełnym task managerem — wymusza mały dzienny zestaw.

Reguła domenowa: otwarte zadania żyją w backlogu; na dany dzień użytkownik może oznaczyć maksymalnie 3 jako fokus — tylko te są „do zrobienia teraz”; niedokończone wracają do backlogu na starcie nowego dnia.

### Najmniejszy zestaw funkcjonalności
- Proste konta (rejestracja / logowanie), dane przypisane do użytkownika
- Dodawanie zadania (tytuł; opcjonalny krótki opis)
- Lista backlogu (otwarte zadania poza dzisiejszym fokusem)
- Ustawienie / zdjęcie zadania jako dzisiejszy fokus, z limitem 3
- Oznaczenie zadania jako zrobione
- Edycja tytułu i usunięcie zadania
- Persystencja między sesjami; reset fokusu na nowy dzień (niedokończone wracają do backlogu)

### Co NIE wchodzi w zakres MVP
- Współdzielone listy, zespoły, role (admin / member)
- Projekty, tagi, podzadania, priorytety poza limitem 3
- Terminy, recykling, zadania cykliczne, kalendarz
- Powiadomienia (email, push)
- Aplikacja mobilna (na start tylko web)
- Integracje (kalendarz, czat, poczta)
- AI (parsowanie języka naturalnego, automatyczny wybór fokusu)
- Offline-first, synchronizacja między urządzeniami w czasie rzeczywistym

### Kryteria sukcesu
- W pierwszej sesji użytkownik dodaje co najmniej jedno zadanie i ustawia je jako dzisiejszy fokus (pełny flow „capture → fokus” działa end-to-end)
- Limit 3 jest egzekwowany: czwarte zadanie nie wchodzi do fokusu, dopóki użytkownik nie zwolni slotu
- Osoba, która ustawiła fokus, kończy w tym dniu przynajmniej 1 z 3 zadań
- Zadania nie znikają między sesjami (poza jawnym usunięciem lub ukończeniem)
- Reset dnia nie kasuje backlogu — przenosi tylko niedokończony fokus z powrotem na listę otwartych
