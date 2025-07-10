"use client"
import { apiService } from "@/services/api"
import { type User } from "@/types/index"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"


function List( {children}: { children: ReactNode} ) {
    return (
        <ul>
            {children}
        </ul>
    )
}

interface ApiResponse {
    code: number
    data: {
        users: User[] 
    }
}
// async function fetchUsers(): Promise<User[]> {
//     const response = await apiService.get<ApiResponse>('/user')
//     if (response.success && response.data) {
//         console.log(response.data)
//         return response.data.data.users
//     } else {
//         alert('error')
//         return []
//     }
// }

async function PostUser(name:string, age:number): Promise<User[]> {
    const response = await apiService.post<ApiResponse>('/user', {'name': name, 'age': age})
    if(response.success && response.data) {
        console.log(response.data.data.users)
        return response.data.data.users
    } else {
        alert('error')
        return []
    }
}



export function TestPage() {
    const [users, setUsers] = useState<User[]>()
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const loadUsers = await PostUser("wyq",10)
                setUsers(loadUsers)
            } catch (error) {
                console.log('Failed to fetch users.')
            }
            finally {
                setLoading(false)
            }
        }

        loadUsers()
    }, [])

    if(loading) {
        return <div>Loading</div>
    }
    
    return (
        <List>
            {users?.map((user,index)=> (
                <li key={index}>
                    <div>
                        {/* <strong>{user.name}</strong> */}
                        <p>Phone: {user.phone}</p>
                        <p>Email: {user.email}</p>
                    </div>
                </li>
            ))}
        </List>
    )
}
