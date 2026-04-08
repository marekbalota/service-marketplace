// Shared types used across routes and components

export type Category = {
  categoryId: string
  name: string
  description: string | null
}

export type Post = {
  postId: string
  postTitle: string
  description: string
  postType: string
  price: string | null
  rateType: string | null
  createdAt: string | Date
  authorName: string
  categories: { categoryId: string; name: string }[]
}

export type PostsPage = {
  items: Post[]
  total: number
  totalPages: number
}

export type UserProfile = {
  userProfileId: string
  accountId: string
  name: string
  email: string
  bio: string | null
  phoneNumber: string | null
  fax: string | null
  createdAt: string | Date
  accountName: string
  roleName: string
}
