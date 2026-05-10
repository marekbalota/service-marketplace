## Functional requirements:

- Users can register for an account using an email and password.
- Users can log in and log out.
- Users can switch between theirs active user profiles.
- Users can create, view and edit their profiles (e.g., update phone number or bio).
- Users can create a post, specifying whether it is an "Offer" or a "Request".
- Users must be able to add a title, description, expected price, and contact details to a post.
- Users can edit or delete their own active posts.
- Users can assign a predefined category (e.g., Tutoring, Plumbing, Design) to their post.
- Any visitor (even unregistered) can view the list of posts.
- Users can filter posts by category and type (Offer vs. Request).
- Users can leave a rating (e.g., 1 to 5 stars) and a written review for another user after a transaction.
- Users can report posts.
- A user's profile must display their average rating based on all reviews received.
- Users can send a direct message to the author of a post to inquire about the service.
- Admins can open administrators interface where can they ban users, create categories...
- Users get notify by email when they register or receive message

## Nonfunctional requirements:

- User passwords must be hashed before being saved to the database.
- Only the creator of a post and admins can edit or delete it.
- The website should be responsive (usable on both desktop and mobile devices).
- Forms for creating posts must clearly highlight required fields.
- The database must enforce referential integrity (e.g., if a user is deleted, their posts are either deleted or marked as inactive).
- The application must support both dark and light mode.
- Application must be covered by end to end and unit tests
- The application will use these technologies. React 19, Drizzle ORM, TanStack Start, Talwind CSS, components from Shadcn, TypeScript, ElysiaJS and PostgreSQL.
