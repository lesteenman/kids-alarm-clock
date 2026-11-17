# Builds the core + simulator adapters to WebAssembly. Use sim/build.sh.
cmake_minimum_required(VERSION 3.20)
project(wake_sim CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Every .cpp in core/src (any subfolder) is part of the sim automatically.
file(GLOB_RECURSE CORE_SOURCES CONFIGURE_DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/../core/src/*.cpp)

add_executable(clock ${CORE_SOURCES} src/sim_adapters.cpp src/bindings.cpp)
target_include_directories(clock PRIVATE ../core/include src)
target_compile_options(clock PRIVATE -Wall -Wextra)
target_link_options(clock PRIVATE
  -lembind
  -sMODULARIZE=1
  -sEXPORT_ES6=1
  -sEXPORT_NAME=createClockModule
  -sALLOW_MEMORY_GROWTH=1
  -sENVIRONMENT=web)
