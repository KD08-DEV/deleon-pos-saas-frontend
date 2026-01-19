import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const BackButton = () => {
    const navigate = useNavigate();

    return (
        <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            className='bg-gradient-to-r from-blue-500 to-cyan-500 p-2.5 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 flex items-center justify-center'
        >
            <ArrowLeft className="w-5 h-5" />
        </motion.button>
    )
}

export default BackButton