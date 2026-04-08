export type Category = {
  categoryId: string
  name: string
  description: string | null
}

export type Post = {
  postId: string
  postTitle: string
  description: string
  postType: 'OFFER' | 'REQUEST'
  price: string | null
  rateType: 'HOURLY' | 'DAILY' | 'FIXED' | null
  createdAt: string | Date
  authorId: string
  authorName: string
  categories: { categoryId: string; name: string }[]
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
